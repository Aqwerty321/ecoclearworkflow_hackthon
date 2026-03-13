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
    'Mining Plan approval from Indian Bureau of Mines (IBM)',
    'Forest Clearance under Forest Conservation Act, 1980 (if forest land involved)',
    'Consent to Establish from CECB/SPCB',
    'Environmental Management Plan (EMP) with specific dust suppression measures',
    'Mine Closure Plan with financial assurance',
    'Rehabilitation & Resettlement (R&R) Plan if displacement involved',
    'Baseline ambient air quality data (PM10, PM2.5, SO2, NOx) within 10km radius',
    'Groundwater impact assessment with hydrogeological study',
    'Biodiversity Impact Assessment for ecologically sensitive areas',
    'Buffer zone compliance: minimum 5km from Protected Areas',
  ],
  'Energy': [
    'Thermal Power: Fly ash utilization plan (100% as per MoEFCC notification)',
    'Thermal Power: Cooling tower specifications and zero liquid discharge (ZLD) plan',
    'Stack emission monitoring plan for PM, SO2, NOx within NAAQS limits',
    'Ambient Air Quality monitoring stations within 10km buffer zone',
    'Water consumption plan with efficiency targets (<3.5 m³/MWh for new plants)',
    'Ash pond design with impervious lining specification',
    'Coal/fuel transportation plan with environmental safeguards',
    'Renewable energy: Bird/wildlife impact assessment (for wind/solar in sensitive areas)',
    'Grid connectivity and evacuation plan',
    'Emergency preparedness and disaster management plan',
  ],
  'Infrastructure': [
    'Traffic Impact Assessment for roads and highways',
    'Tree enumeration and compensatory afforestation plan (1:3 ratio)',
    'Drainage and flood management plan',
    'Construction debris management and recycling plan',
    'Noise pollution mitigation plan for residential proximate zones',
    'Soil erosion control measures during construction phase',
    'Green belt development plan (minimum 33% of project area)',
    'Occupational health and safety plan for construction workers',
    'Waste management plan (solid waste, sewage, hazardous waste)',
    'Cultural heritage impact assessment (if applicable)',
  ],
  'Manufacturing': [
    'Hazardous waste management authorization under HW Rules 2016',
    'Effluent Treatment Plant (ETP) design with ZLD capability',
    'Air pollution control equipment specifications (ESP/bag filter)',
    'Occupational health monitoring plan',
    'Chemical storage and handling safety plan (for chemical industry)',
    'Sponge Iron: Particulate emission limit compliance (<50 mg/Nm³)',
    'Product-specific environmental standards compliance',
    'Waste minimization and resource recovery plan',
    'Environmental audit and compliance monitoring schedule',
    'Insurance coverage for environmental liability',
  ],
};

// ---- Compliance Check Flow ----

const RegulatoryComplianceInputSchema = z.object({
  projectName: z.string().describe('Name of the project'),
  industrySector: z.string().describe('Industry sector (Mining, Energy, Infrastructure, etc.)'),
  category: z.string().describe('Application category: A, B1, or B2'),
  projectDescription: z.string().describe('Detailed project description'),
  location: z.string().optional().describe('Project location'),
  district: z.string().optional().describe('District where project is located'),
  uploadedDocumentTypes: z.array(z.string()).describe('List of document types already uploaded'),
  existingComments: z.array(z.string()).optional().describe('Previous EDS comments if any'),
});
export type RegulatoryComplianceInput = z.infer<typeof RegulatoryComplianceInputSchema>;

const ComplianceFindingSchema = z.object({
  parameter: z.string().describe('The regulatory parameter being checked'),
  status: z.enum(['compliant', 'non_compliant', 'needs_review', 'missing']).describe('Compliance status'),
  severity: z.enum(['critical', 'major', 'minor', 'info']).describe('Severity of the finding'),
  details: z.string().describe('Detailed explanation of the finding'),
  recommendation: z.string().describe('Recommended action to resolve the issue'),
});

const RegulatoryComplianceOutputSchema = z.object({
  overallScore: z.number().min(0).max(100).describe('Overall compliance score (0-100)'),
  riskLevel: z.enum(['low', 'medium', 'high', 'critical']).describe('Overall risk assessment'),
  sectorSpecificFindings: z.array(ComplianceFindingSchema)
    .describe('Detailed findings for each regulatory parameter checked'),
  missingDocuments: z.array(z.string()).describe('List of required documents not yet uploaded'),
  edsRecommendation: z.string().describe('Recommended EDS communication if deficiencies exist'),
  environmentalRiskSummary: z.string().describe('Summary of environmental risks identified'),
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
      : '  No sector-specific rules configured. Apply general environmental clearance requirements.';

    const { output } = await ai.generate({
      prompt: `You are an expert environmental regulatory compliance officer for the Chhattisgarh Environment Conservation Board (CECB).

Perform a thorough regulatory compliance check for the following application:

PROJECT DETAILS:
- Name: ${input.projectName}
- Sector: ${input.industrySector}
- Category: ${input.category} (${input.category === 'A' ? 'High Impact - Requires full EIA' : input.category === 'B1' ? 'Medium Impact - Requires EIA' : 'Low Impact - May require limited EIA'})
- Location: ${input.location || 'Not specified'}
- District: ${input.district || 'Not specified'}
- Description: ${input.projectDescription}

DOCUMENTS ALREADY UPLOADED:
${input.uploadedDocumentTypes.length > 0 ? input.uploadedDocumentTypes.map(d => `  - ${d}`).join('\n') : '  None'}

${input.existingComments && input.existingComments.length > 0 ? `PREVIOUS EDS COMMENTS:\n${input.existingComments.map(c => `  - ${c}`).join('\n')}` : ''}

SECTOR-SPECIFIC REGULATORY PARAMETERS TO CHECK:
${sectorRulesText}

INSTRUCTIONS:
1. Check each sector-specific parameter against the project description and uploaded documents.
2. For each parameter, determine the compliance status (compliant, non_compliant, needs_review, missing).
3. Assign severity (critical for safety/legal issues, major for significant gaps, minor for documentation issues, info for observations).
4. Calculate an overall compliance score from 0-100.
5. List all documents that should be uploaded but haven't been.
6. If deficiencies exist, draft a formal EDS communication that the Scrutiny Team can send to the Project Proponent.
7. Summarize the key environmental risks.

Be specific and reference actual Indian environmental regulations where applicable (EIA Notification 2006, Air Act 1981, Water Act 1974, Forest Conservation Act 1980, etc.).`,
      output: {
        schema: RegulatoryComplianceOutputSchema,
      },
      config: {
        temperature: 0.1,
      },
    });

    if (!output) {
      throw new Error('AI failed to generate compliance check output.');
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
  applicantName: z.string().optional(),
  industrySector: z.string(),
  category: z.string(),
  deficiencies: z.array(z.string()).describe('List of identified deficiencies'),
  missingDocuments: z.array(z.string()).describe('Required documents not yet submitted'),
});
export type EDSDraftInput = z.infer<typeof EDSDraftInputSchema>;

const EDSDraftOutputSchema = z.object({
  subject: z.string().describe('Formal subject line for the EDS letter'),
  body: z.string().describe('Formal body of the EDS letter'),
  deadlineDays: z.number().describe('Recommended deadline in days for response'),
  attachmentChecklist: z.array(z.string()).describe('Checklist of items the proponent must provide'),
});
export type EDSDraftOutput = z.infer<typeof EDSDraftOutputSchema>;

const edsDraftFlow = ai.defineFlow(
  {
    name: 'generateEDSDraftFlow',
    inputSchema: EDSDraftInputSchema,
    outputSchema: EDSDraftOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      prompt: `You are drafting a formal Essential Document Sought (EDS) letter for the Chhattisgarh Environment Conservation Board.

PROJECT: ${input.projectName}
APPLICANT: ${input.applicantName || 'Project Proponent'}
SECTOR: ${input.industrySector}
CATEGORY: ${input.category}

IDENTIFIED DEFICIENCIES:
${input.deficiencies.map((d, i) => `${i + 1}. ${d}`).join('\n')}

MISSING DOCUMENTS:
${input.missingDocuments.map((d, i) => `${i + 1}. ${d}`).join('\n')}

Draft a formal, professional EDS letter that:
1. References the specific regulatory requirements
2. Clearly lists each deficiency with the expected resolution
3. Lists all missing documents that must be provided
4. Sets a reasonable deadline (typically 15-30 days)
5. Warns that failure to respond may result in rejection of the application
6. Uses formal government correspondence tone

The letter should be ready to send without further editing.`,
      output: {
        schema: EDSDraftOutputSchema,
      },
      config: {
        temperature: 0.2,
      },
    });

    if (!output) {
      throw new Error('AI failed to generate EDS draft.');
    }

    return output;
  }
);

export async function generateEDSDraft(
  input: EDSDraftInput
): Promise<EDSDraftOutput> {
  return edsDraftFlow(input);
}
