'use server';
/**
 * @fileOverview An AI tool for the Scrutiny Team to analyze submitted documents for common compliance issues,
 * highlight missing information, or suggest potential environmental impacts.
 *
 * - scrutinyDocumentSummaryAndFlagging - A function that handles the document scrutiny process.
 * - ScrutinyDocumentSummaryAndFlaggingInput - The input type for the function.
 * - ScrutinyDocumentSummaryAndFlaggingOutput - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

// 1. Define Input Schema
const ScrutinyDocumentSummaryAndFlaggingInputSchema = z.object({
  projectDescription: z.string().describe('A detailed description of the project.'),
  industrySector: z.string().optional().describe('Industry sector of the project (e.g., Mining, Energy, Infrastructure, Manufacturing).'),
  category: z.enum(['A', 'B1', 'B2']).optional().describe('EC application category: A (High Impact), B1 (Medium Impact), B2 (Low Impact).'),
  documentUrls:
    z.array(z.string().describe("A document's content as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."))
      .min(1, 'At least one document URL is required.')
      .describe('An array of data URIs for the documents to be analyzed.'),
});
export type ScrutinyDocumentSummaryAndFlaggingInput = z.infer<typeof ScrutinyDocumentSummaryAndFlaggingInputSchema>;

// 2. Define Output Schema — structured findings instead of flat string arrays
const ScrutinyFindingSchema = z.object({
  issue: z.string().describe('Concise description of the compliance issue or potential impact.'),
  severity: z.enum(['critical', 'major', 'minor', 'info']).describe('Severity: critical = legal/safety violation; major = significant gap; minor = documentation gap; info = observation.'),
  regulation: z.string().describe('Specific Indian regulation or CECB guideline this relates to (e.g., EIA Notification 2006, Air Act 1981, Forest Conservation Act 1980).'),
  source: z.string().describe('Which document or section the finding is based on, or "Project Description" if inferred from the description.'),
  recommendation: z.string().describe('Specific corrective action or document required to resolve this finding.'),
});

const ScrutinyDocumentSummaryAndFlaggingOutputSchema = z.object({
  summary: z.string().describe('A structured per-document summary covering: (1) document type identified, (2) key content, (3) adequacy assessment. Max 3 sentences per document.'),
  complianceFindings: z.array(ScrutinyFindingSchema).describe('Structured compliance findings, each citing the specific regulation and source document.'),
  potentialImpacts: z.array(ScrutinyFindingSchema).describe('Potential environmental impacts clearly supported by evidence in the documents or project description.'),
  overallAssessment: z.enum(['adequate', 'needs_revision', 'inadequate']).describe('Overall adequacy of the submission: adequate = can proceed to EDS/MoM; needs_revision = minor gaps requiring EDS; inadequate = major gaps requiring resubmission.'),
});
export type ScrutinyDocumentSummaryAndFlaggingOutput = z.infer<typeof ScrutinyDocumentSummaryAndFlaggingOutputSchema>;

// 3. Define the Flow
const scrutinyDocumentSummaryAndFlaggingFlow = ai.defineFlow(
  {
    name: 'scrutinyDocumentSummaryAndFlaggingFlow',
    inputSchema: ScrutinyDocumentSummaryAndFlaggingInputSchema,
    outputSchema: ScrutinyDocumentSummaryAndFlaggingOutputSchema,
  },
  async (input) => {
    const { projectDescription, documentUrls, industrySector, category } = input;

    const categoryLabel = category === 'A' ? 'Category A (High Impact — mandatory full EIA under EIA Notification 2006)'
      : category === 'B1' ? 'Category B1 (Medium Impact — requires EIA)'
      : category === 'B2' ? 'Category B2 (Low Impact — may require limited EIA)'
      : 'Category not specified';

    const promptParts = [
      {
        text: `You are a senior environmental scrutiny officer at the Chhattisgarh Environment Conservation Board (CECB), India.

Your task is to rigorously analyze the uploaded project documents against applicable Indian environmental law and CECB clearance requirements.

PROJECT CONTEXT:
- Description: "${projectDescription}"
- Sector: ${industrySector || 'Not specified'}
- Application Category: ${categoryLabel}

APPLICABLE REGULATORY FRAMEWORK:
- EIA Notification 2006 (MoEFCC) — mandatory for all scheduled activities
- Environment Protection Act, 1986
- Air (Prevention and Control of Pollution) Act, 1981 — NAAQS limits
- Water (Prevention and Control of Pollution) Act, 1974
- Forest Conservation Act, 1980 — mandatory for forest land diversion
- Wildlife Protection Act, 1972 — buffer zone / eco-sensitive zone compliance
- Hazardous and Other Wastes (Management and Transboundary Movement) Rules, 2016
- CECB Consent to Establish / Consent to Operate conditions
- National Green Tribunal (NGT) orders relevant to the sector

INSTRUCTIONS:
1. DOCUMENT SUMMARY: For each uploaded document, identify its type, summarize its key content, and assess its adequacy against CECB requirements (2–3 sentences max per document).

2. COMPLIANCE FINDINGS: Identify specific regulatory non-compliance issues. For each finding:
   - Cite the exact regulation violated or the CECB checklist item not satisfied.
   - State which document (or the project description) the finding derives from.
   - Do NOT flag issues that are not supported by document content or the project description. If something is uncertain, set severity to "info" and note the uncertainty explicitly.

3. POTENTIAL IMPACTS: Identify potential environmental impacts that ARE supported by evidence in the documents or project description. Do NOT speculate beyond what the documents contain. Set severity based on regulatory significance.

4. OVERALL ASSESSMENT: Based on your analysis, rate the submission overall.

Severity guide:
- critical: Safety risk or clear legal violation (e.g., Forest land without FC, project within 5km of Protected Area)
- major: Significant gap that will require EDS and likely delay clearance
- minor: Documentation gap or minor deficiency fixable with a short response
- info: Observation or clarification point with no regulatory consequence`,
      },
      ...documentUrls.map((url) => {
        if (url.startsWith('data:text/plain;base64,')) {
          const decoded = Buffer.from(url.replace('data:text/plain;base64,', ''), 'base64').toString('utf-8');
          return { text: `\n\n--- Document Content ---\n${decoded}` };
        }
        return { media: { url: url } };
      }),
    ];

    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: promptParts,
      output: {
        schema: ScrutinyDocumentSummaryAndFlaggingOutputSchema,
      },
      config: {
        temperature: 0.1,
      },
    });

    if (!output) {
      throw new Error('AI scrutiny analysis failed to produce output. Please retry.');
    }

    return output;
  }
);

// 4. Exported wrapper function
export async function scrutinyDocumentSummaryAndFlagging(
  input: ScrutinyDocumentSummaryAndFlaggingInput
): Promise<ScrutinyDocumentSummaryAndFlaggingOutput> {
  return scrutinyDocumentSummaryAndFlaggingFlow(input);
}
