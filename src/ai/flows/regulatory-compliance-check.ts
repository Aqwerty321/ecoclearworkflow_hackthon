'use server';
/**
 * @fileOverview Enhanced AI flow for regulatory compliance checking against
 * CECB sector-specific parameters. This implements the "Regulatory Analyzer"
 * and "Validation & Draft" agent nodes from the upgrade plan.
 *
 * - regulatoryComplianceCheck - Cross-references application data against sector rules
 * - generateEDSDraft - Auto-generates an EDS (Essential Document Sought) communication
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// ---- Sector-Specific Regulatory Parameters (CECB Guidelines) ----
// These would ideally come from Admin-configured templates in production
const SECTOR_REGULATIONS: Record<string, string[]> = {
  'Mining': [
    'Mining Plan approval from Indian Bureau of Mines (IBM) — mandatory under MMDR Act 1957',
    'Forest Clearance under Forest Conservation Act, 1980 (if forest land involved)',
    'Consent to Establish from CECB under Air Act 1981 and Water Act 1974',
    'Environmental Management Plan (EMP) with specific dust suppression measures (NAAQS PM10 limit: 100 µg/m³)',
    'Mine Closure Plan with financial assurance mechanism',
    'Rehabilitation & Resettlement (R&R) Plan if displacement involved (RFCTLARR Act 2013)',
    'Baseline ambient air quality data (PM10, PM2.5, SO2, NOx) from at least 3 monitoring stations within 10km radius',
    'Hydrogeological study and groundwater impact assessment',
    'Biodiversity Impact Assessment for ecologically sensitive areas',
    'Buffer zone compliance: minimum 500m from habitation, 5km from Protected Areas (Wildlife Protection Act 1972)',
    'Topsoil preservation and progressive land reclamation plan',
  ],
  'Energy': [
    'Thermal Power: Fly ash utilization plan (100% within 5 years — MoEFCC notification 2021)',
    'Thermal Power: Zero liquid discharge (ZLD) plan — MoEFCC OM dated 2016',
    'Stack emission monitoring: PM ≤30 mg/Nm³, SO2 ≤100 mg/Nm³, NOx ≤100 mg/Nm³ (2015 norms for new plants)',
    'Ambient Air Quality monitoring stations at 4 cardinal directions within 10km buffer zone',
    'Water consumption plan — efficiency target ≤3.5 m³/MWh for new plants (MoEFCC 2015)',
    'Ash pond design with double impervious lining and leachate collection system',
    'Coal/fuel transportation plan with dust suppression and spillage control',
    'Renewable energy: Bird/wildlife impact assessment (mandatory for wind/solar in eco-sensitive zones)',
    'Grid connectivity and evacuation plan with PGCIL/SLDC approval',
    'Emergency preparedness and disaster management plan (National Disaster Management Act 2005)',
    'Cooling water discharge temperature compliance (≤7°C above ambient — Water Act 1974)',
  ],
  'Infrastructure': [
    'Traffic Impact Assessment for roads and highways (IRC guidelines)',
    'Tree enumeration and compensatory afforestation plan (1:3 ratio — Forest Conservation Act 1980)',
    'Drainage and flood management plan (conforming to CWC flood zoning norms)',
    'Construction and Demolition Waste Management Rules 2016 compliance',
    'Noise pollution mitigation plan — CPCB norms (day: 55 dB(A), night: 45 dB(A) in residential areas)',
    'Soil erosion control measures during construction phase (BMP documentation)',
    'Green belt development plan (minimum 33% of project area — MoEFCC guidelines)',
    'Occupational health and safety plan (Building and Other Construction Workers Act 1996)',
    'Sewage Treatment Plant design for construction camp waste',
    'Cultural heritage impact assessment if within 300m of ASI-protected monument',
  ],
  'Manufacturing': [
    'Hazardous waste management authorization under Hazardous and Other Wastes Rules 2016',
    'Effluent Treatment Plant (ETP) design with Zero Liquid Discharge (ZLD) capability',
    'Air pollution control equipment specifications: ESP/bag filter with ≥99.9% efficiency',
    'Occupational health monitoring plan (Factories Act 1948, OSHA standards)',
    'Chemical storage and handling safety plan (Manufacture Storage Import of Hazardous Chemical Rules 1989)',
    'Stack emission compliance: sector-specific CECB/MoEFCC standards',
    'Waste minimization plan: hierarchy (reduce → reuse → recycle) per Schedule IV of HW Rules 2016',
    'Environmental audit schedule: half-yearly compliance reports to CECB',
    'Insurance coverage for environmental liability (Public Liability Insurance Act 1991)',
    'Green belt of minimum 33% of total project area (MoEFCC guidelines)',
  ],
  'Tourism': [
    'Carrying capacity assessment for tourism zones (MoEFCC eco-tourism guidelines)',
    'Solid waste management plan compliant with SWM Rules 2016',
    'Sewage treatment and disposal plan (no discharge into natural water bodies)',
    'Compliance with Coastal Regulation Zone (CRZ) norms if applicable',
    'Eco-sensitive zone (ESZ) compliance — no permanent structures within notified ESZ buffer',
    'Biodiversity assessment and no-impact declaration for wildlife corridors',
    'Rainwater harvesting and water conservation plan',
    'Green building standards compliance (ECBC or GRIHA rating target)',
  ],
  'Agriculture & Food Processing': [
    'Effluent treatment for process wastewater (BOD ≤100 mg/L for land disposal — Water Act 1974)',
    'Odour control plan for food processing operations',
    'Solid organic waste composting or biogas utilization plan',
    'Pesticide/chemical storage compliance (Insecticides Act 1968)',
    'Groundwater extraction permission (Central Ground Water Authority)',
    'Noise compliance for processing equipment (CPCB norms)',
  ],
  'Healthcare': [
    'Biomedical waste management authorization (BMW Management Rules 2016)',
    'Common effluent treatment plant (CETP) tie-up or in-house ETP',
    'Radiation safety plan for diagnostic imaging equipment (Atomic Energy Regulatory Board)',
    'Hazardous chemical storage plan for laboratory chemicals',
    'Infection control and waste segregation procedures (colour-coded bins)',
    'Sewage treatment plant for hospital wastewater',
  ],
};

// ---- Compliance Check Flow ----

const RegulatoryComplianceInputSchema = z.object({
  projectName: z.string().describe('Name of the project'),
  industrySector: z.string().describe('Industry sector (Mining, Energy, Infrastructure, Manufacturing, etc.)'),
  category: z.enum(['A', 'B1', 'B2']).describe('Application category: A (High Impact), B1 (Medium Impact), or B2 (Low Impact)'),
  projectDescription: z.string().describe('Detailed project description'),
  location: z.string().optional().describe('Project location'),
  district: z.string().optional().describe('District where project is located'),
  uploadedDocumentTypes: z.array(z.string()).describe('List of document types already uploaded'),
  existingComments: z.array(z.string()).optional().describe('Previous EDS comments if any'),
});
export type RegulatoryComplianceInput = z.infer<typeof RegulatoryComplianceInputSchema>;

const ComplianceFindingSchema = z.object({
  parameter: z.string().describe('The regulatory parameter being checked'),
  status: z.enum(['compliant', 'non_compliant', 'needs_review', 'missing', 'not_applicable'])
    .describe('Compliance status: not_applicable = parameter does not apply to this specific project type/location'),
  severity: z.enum(['critical', 'major', 'minor', 'info']).describe('Severity of the finding'),
  details: z.string().describe('Detailed explanation of the finding with specific regulatory reference'),
  recommendation: z.string().describe('Specific corrective action or document required'),
});

const RegulatoryComplianceOutputSchema = z.object({
  overallScore: z.number().min(0).max(100).describe(
    'Compliance score 0–100 computed as: start at 100, subtract: critical finding=20pts, major=10pts, minor=3pts, missing doc=5pts. Floor at 0.'
  ),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).describe(
    'Risk level: low (score ≥80, no critical findings), medium (score 60–79 or 1 major), high (score 40–59 or 2+ major), critical (score <40 or any critical finding)'
  ),
  sectorSpecificFindings: z.array(ComplianceFindingSchema)
    .describe('Findings for each regulatory parameter checked — include all parameters, even compliant/not_applicable ones'),
  missingDocuments: z.array(z.string()).describe('List of required documents not yet uploaded, with specific regulatory basis'),
  edsRecommendation: z.string().describe('One-paragraph summary of recommended EDS action (not the full letter — use generateEDSDraft for the full letter)'),
  environmentalRiskSummary: z.string().describe('2–3 paragraph summary of key environmental risks, citing specific regulatory thresholds and mitigation requirements'),
});
export type RegulatoryComplianceOutput = z.infer<typeof RegulatoryComplianceOutputSchema>;

const regulatoryComplianceFlow = ai.defineFlow(
  {
    name: 'regulatoryComplianceCheckFlow',
    inputSchema: RegulatoryComplianceInputSchema,
    outputSchema: RegulatoryComplianceOutputSchema,
  },
  async (input) => {
    const sectorRules = SECTOR_REGULATIONS[input.industrySector] || [];
    const sectorRulesText = sectorRules.length > 0
      ? sectorRules.map((r, i) => `  ${i + 1}. ${r}`).join('\n')
      : `  No sector-specific rules configured for "${input.industrySector}". Apply general EIA Notification 2006 requirements and CECB standard checklist for unlisted sectors.`;

    const categoryLabel = input.category === 'A'
      ? 'Category A — High Impact (mandatory full EIA, public hearing required)'
      : input.category === 'B1'
      ? 'Category B1 — Medium Impact (EIA required, state-level appraisal)'
      : 'Category B2 — Low Impact (may require limited EIA, SEIAA discretion)';

    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: `You are a senior environmental regulatory compliance officer at the Chhattisgarh Environment Conservation Board (CECB).

Perform a thorough compliance check for the following application against CECB sector-specific parameters and applicable Indian environmental law.

PROJECT DETAILS:
- Name: ${input.projectName}
- Sector: ${input.industrySector}
- Category: ${categoryLabel}
- Location: ${input.location || 'Not specified'}
- District: ${input.district || 'Not specified'}
- Description: ${input.projectDescription}

DOCUMENTS ALREADY UPLOADED:
${input.uploadedDocumentTypes.length > 0 ? input.uploadedDocumentTypes.map(d => `  - ${d}`).join('\n') : '  None'}

${input.existingComments && input.existingComments.length > 0 ? `PREVIOUS EDS COMMENTS:\n${input.existingComments.map(c => `  - ${c}`).join('\n')}\n` : ''}
SECTOR-SPECIFIC REGULATORY PARAMETERS TO CHECK:
${sectorRulesText}

SCORING INSTRUCTIONS (follow exactly):
- Start at 100 points.
- Subtract 20 for each finding with status=critical.
- Subtract 10 for each finding with status=major.
- Subtract 3 for each finding with status=minor.
- Subtract 5 for each missing document.
- Findings with status=compliant, needs_review, or not_applicable do not subtract points.
- Floor the score at 0.
- Map score to riskLevel: score≥80 AND no critical findings → "low"; 60–79 OR 1 major → "medium"; 40–59 OR 2+ major findings → "high"; score<40 OR any critical finding → "critical".

PARAMETER INSTRUCTIONS:
- For each parameter in the list above, determine its compliance status.
- Use "not_applicable" if the parameter clearly does not apply to this project type, scale, or location (e.g., Coastal Regulation Zone for an inland project).
- Use "missing" if a document or plan is required but not in the uploaded list.
- Use "needs_review" if available documents are insufficient to confirm compliance.
- Use "compliant" only if there is positive evidence from uploaded documents or project description.
- For "non_compliant": cite the exact regulatory limit or requirement violated.

MISSING DOCUMENTS: List only documents that are actually required under the applicable regulations for this category and sector, but are absent from the uploaded list. Include the regulatory basis for each.

Be specific. Reference actual Indian environmental regulations (EIA Notification 2006, Air Act 1981, Water Act 1974, Forest Conservation Act 1980, etc.) and CECB guidelines.`,
      output: {
        schema: RegulatoryComplianceOutputSchema,
      },
      config: {
        temperature: 0.1,
      },
    });

    if (!output) {
      throw new Error('AI failed to generate compliance check output. Please retry.');
    }

    return output;
  }
);

export async function regulatoryComplianceCheck(
  input: RegulatoryComplianceInput
): Promise<RegulatoryComplianceOutput> {
  return regulatoryComplianceFlow(input);
}

// ---- EDS Draft Generation Flow ----

const EDSDraftInputSchema = z.object({
  projectName: z.string(),
  applicationId: z.string().optional().describe('Application reference number for official correspondence'),
  applicantName: z.string().describe('Full name of the project proponent (required for official correspondence)'),
  industrySector: z.string(),
  category: z.enum(['A', 'B1', 'B2']),
  deficiencies: z.array(z.string()).describe('List of identified deficiencies with regulatory references'),
  missingDocuments: z.array(z.string()).describe('Required documents not yet submitted, with regulatory basis'),
});
export type EDSDraftInput = z.infer<typeof EDSDraftInputSchema>;

const EDSDraftOutputSchema = z.object({
  subject: z.string().describe('Formal subject line in the format: "Sub: EDS for EC Application — [Project Name] — Ref: [Application ID]"'),
  body: z.string().describe('Formal letter body with: (1) reference/date line, (2) deficiency list with regulatory citations, (3) missing documents checklist, (4) deadline clause, (5) rejection warning, (6) signature block placeholder "[Scrutiny Officer Name, Designation, CECB]"'),
  deadlineDays: z.number().min(15).max(30).describe('Deadline in days — must be 21 for Category A, 15 for B1/B2 (CECB standard)'),
  attachmentChecklist: z.array(z.string()).describe('Numbered checklist of all items the proponent must provide, matching the body'),
});
export type EDSDraftOutput = z.infer<typeof EDSDraftOutputSchema>;

const edsDraftFlow = ai.defineFlow(
  {
    name: 'generateEDSDraftFlow',
    inputSchema: EDSDraftInputSchema,
    outputSchema: EDSDraftOutputSchema,
  },
  async (input) => {
    const deadlineDays = input.category === 'A' ? 21 : 15;

    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: `You are drafting an official Essential Document Sought (EDS) letter for the Chhattisgarh Environment Conservation Board (CECB).

APPLICATION DETAILS:
- Reference No.: ${input.applicationId || 'CECB/EC/[To be assigned]'}
- Project: ${input.projectName}
- Applicant: ${input.applicantName}
- Sector: ${input.industrySector}
- Category: ${input.category} (${input.category === 'A' ? 'High Impact' : input.category === 'B1' ? 'Medium Impact' : 'Low Impact'})
- Standard Deadline: ${deadlineDays} days from date of this letter

IDENTIFIED DEFICIENCIES (with regulatory basis):
${input.deficiencies.map((d, i) => `${i + 1}. ${d}`).join('\n')}

MISSING DOCUMENTS (with regulatory basis):
${input.missingDocuments.length > 0 ? input.missingDocuments.map((d, i) => `${i + 1}. ${d}`).join('\n') : 'None — deficiencies relate to content quality of existing documents.'}

LETTER REQUIREMENTS:
1. Open with "CHHATTISGARH ENVIRONMENT CONSERVATION BOARD" letterhead reference.
2. Include a formal reference line: "Ref: CECB/EC/${input.applicationId || '[Application No.]'}/[Year]".
3. Address to: "${input.applicantName}" as "The Project Proponent".
4. Reference the specific regulatory basis for each deficiency — cite acts and rules by name.
5. List missing documents with a deadline of ${deadlineDays} days.
6. Include standard CECB rejection warning: "Failure to respond within the stipulated period may result in rejection of the application under Rule 14 of the EIA Notification 2006."
7. Close with signature placeholder: "[Name]\n[Designation]\nChhattisgarh Environment Conservation Board\nRaipur, Chhattisgarh"
8. The body must be ready to use with only the blanks in square brackets filled in.

Set deadlineDays to exactly ${deadlineDays}.`,
      output: {
        schema: EDSDraftOutputSchema,
      },
      config: {
        temperature: 0.15,
      },
    });

    if (!output) {
      throw new Error('AI failed to generate EDS draft. Please retry.');
    }

    return output;
  }
);

export async function generateEDSDraft(
  input: EDSDraftInput
): Promise<EDSDraftOutput> {
  return edsDraftFlow(input);
}
