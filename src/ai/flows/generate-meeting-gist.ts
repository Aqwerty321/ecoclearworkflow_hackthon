'use server';
/**
 * @fileOverview A Genkit flow for generating an initial meeting gist based on application details.
 *
 * The gist is a structured, human-readable briefing document that the MoM Team member
 * reviews and edits before it is used to generate the formal Minutes of Meeting.
 *
 * - generateMeetingGist - A function that handles the meeting gist generation process.
 * - GenerateMeetingGistInput - The input type for the generateMeetingGist function.
 * - GenerateMeetingGistOutput - The return type for the generateMeetingGist function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateMeetingGistInputSchema = z.object({
  projectName: z.string().describe('The name of the project.'),
  industrySector: z.string().describe('The industry sector of the project.'),
  category: z.enum(['A', 'B1', 'B2']).describe('The application category: A (High Impact), B1 (Medium Impact), B2 (Low Impact).'),
  projectDescription: z.string().describe('A detailed description of the project.'),
  environmentalRiskSummary: z.string().optional().describe('AI-generated environmental risk summary from prior scrutiny/compliance check, if available.'),
  complianceScore: z.number().optional().describe('Regulatory compliance score (0–100) from compliance check, if available.'),
  riskLevel: z.string().optional().describe('Risk level from compliance check: low, medium, high, or critical.'),
  location: z.string().optional().describe('Project location or district.'),
});
export type GenerateMeetingGistInput = z.infer<typeof GenerateMeetingGistInputSchema>;

// Output is a formatted string — the MoM Team edits this in the UI before generating the formal MoM
const GenerateMeetingGistOutputSchema = z.string().describe(
  'A structured, human-readable meeting briefing in markdown-style sections that the MoM Team will review and edit.'
);
export type GenerateMeetingGistOutput = z.infer<typeof GenerateMeetingGistOutputSchema>;

export async function generateMeetingGist(
  input: GenerateMeetingGistInput
): Promise<GenerateMeetingGistOutput> {
  return generateMeetingGistFlow(input);
}

const categoryLabel = (c: string) =>
  c === 'A' ? 'Category A — High Impact (Full EIA, Public Hearing required under EIA Notification 2006)'
  : c === 'B1' ? 'Category B1 — Medium Impact (EIA required, State-level appraisal by SEIAA)'
  : 'Category B2 — Low Impact (Limited EIA, SEIAA discretion)';

const generateMeetingGistFlow = ai.defineFlow(
  {
    name: 'generateMeetingGistFlow',
    inputSchema: GenerateMeetingGistInputSchema,
    outputSchema: GenerateMeetingGistOutputSchema,
  },
  async (input) => {
    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: `You are a senior environmental appraisal officer at the Chhattisgarh Environment Conservation Board (CECB).

Generate a concise but comprehensive meeting briefing for the Expert Appraisal Committee. This briefing will be reviewed and edited by the MoM Team before the committee meeting.

APPLICATION DETAILS:
- Project Name: ${input.projectName}
- Sector: ${input.industrySector}
- Category: ${categoryLabel(input.category)}
- Location: ${input.location || 'Not specified'}
- Description: ${input.projectDescription}
${input.complianceScore !== undefined ? `- Compliance Score: ${input.complianceScore}/100 (Risk: ${input.riskLevel || 'unknown'})` : ''}
${input.environmentalRiskSummary ? `\nPRIOR RISK ASSESSMENT:\n${input.environmentalRiskSummary}` : ''}

Generate the briefing in exactly this structure (use plain text with these section headers, not markdown):

PROJECT BRIEF
[2–3 sentences: project name, location, sector, scale, and primary activity]

REGULATORY CONTEXT
[Which regulations apply and what the Category means for this application. Reference EIA Notification 2006 schedule entry if applicable. Mention any mandatory public hearing status.]

KEY ENVIRONMENTAL CONCERNS
[3–5 bullet points of the most significant environmental concerns for this project type and location. Be specific — cite likely impacts, not generic platitudes. If risk assessment is available, prioritise those findings.]

DOCUMENTS REVIEWED
[Brief note on adequacy of submitted documentation — what is present and what may be outstanding]

COMMITTEE FOCUS AREAS
[2–3 specific questions or aspects the committee should probe during the meeting, based on the sector and risk profile]

DRAFT RECOMMENDATION (STARTING POINT)
[Suggest one of: "Grant EC with conditions" / "Defer pending EDS response" / "Reject due to critical non-compliance" — with a 1-sentence rationale. The committee will decide the final outcome.]

Keep each section concise. Total length: 300–450 words. Do not add extra commentary outside these sections.`,
      output: { schema: GenerateMeetingGistOutputSchema },
      config: { temperature: 0.2 },
    });

    if (!output) {
      throw new Error('AI failed to generate meeting gist. Please retry.');
    }

    return output;
  }
);
