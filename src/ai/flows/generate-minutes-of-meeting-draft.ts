'use server';
/**
 * @fileOverview This file implements a Genkit flow for generating a structured draft of the Minutes of Meeting (MoM).
 *
 * - generateMinutesOfMeetingDraft - A function that initiates the MoM draft generation process.
 * - GenerateMinutesOfMeetingDraftInput - The input type for the generateMinutesOfMeetingDraft function.
 * - GenerateMinutesOfMeetingDraftOutput - The return type for the generateMinutesOfMeetingDraft function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateMinutesOfMeetingDraftInputSchema = z.object({
  editedGist: z
    .string()
    .describe(
      'The edited meeting gist provided by the MoM Team member, including key discussions and decisions.'
    ),
  projectName: z.string().describe('The name of the project.'),
  industrySector: z.string().describe('The industry sector of the project.'),
  category: z
    .enum(['A', 'B1', 'B2'])
    .describe('The application category (A, B1, or B2).'),
  location: z.string().optional().describe('The location of the project.'),
  environmentalRiskSummary: z
    .string()
    .optional()
    .describe('A summary of environmental risks associated with the project from prior AI analysis.'),
});

export type GenerateMinutesOfMeetingDraftInput = z.infer<
  typeof GenerateMinutesOfMeetingDraftInputSchema
>;

const GenerateMinutesOfMeetingDraftOutputSchema = z.object({
  projectName: z.string().describe('The name of the project — copied from input.'),
  discussionSummary: z
    .string()
    .describe(
      'A formal, paragraph-form summary of the key points discussed during the meeting. Minimum 3 sentences. Must reference specific environmental concerns, regulatory parameters discussed, and any expert queries raised.'
    ),
  committeeDecision: z
    .enum(['Approved', 'Approved with Conditions', 'Deferred', 'Rejected', 'Pending'])
    .describe(
      'The formal committee decision. Choose exactly one: "Approved" (unconditional grant), "Approved with Conditions" (EC granted with stipulations), "Deferred" (more information required), "Rejected" (application denied), "Pending" (decision not yet taken — use only if gist explicitly states so).'
    ),
  conditions: z
    .array(z.string())
    .min(1)
    .describe(
      'Conditions or stipulations imposed by the committee. Must contain at least one entry. If no conditions were imposed (e.g., clean Approved), use ["No additional conditions imposed beyond standard EC compliance requirements."].'
    ),
  recommendations: z
    .array(z.string())
    .default([])
    .describe(
      'Recommendations or next steps suggested by the committee. May be empty if none. Typical entries: follow-up monitoring requirements, post-EC submissions, public hearing directions.'
    ),
});

export type GenerateMinutesOfMeetingDraftOutput = z.infer<
  typeof GenerateMinutesOfMeetingDraftOutputSchema
>;

export async function generateMinutesOfMeetingDraft(
  input: GenerateMinutesOfMeetingDraftInput
): Promise<GenerateMinutesOfMeetingDraftOutput> {
  return generateMinutesOfMeetingDraftFlow(input);
}

const generateMinutesOfMeetingDraftFlow = ai.defineFlow(
  {
    name: 'generateMinutesOfMeetingDraftFlow',
    inputSchema: GenerateMinutesOfMeetingDraftInputSchema,
    outputSchema: GenerateMinutesOfMeetingDraftOutputSchema,
  },
  async (input) => {
    const categoryLabel = input.category === 'A'
      ? 'Category A (High Impact — EIA Notification 2006)'
      : input.category === 'B1'
      ? 'Category B1 (Medium Impact — State EIA Authority)'
      : 'Category B2 (Low Impact — Limited EIA)';

    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt: `You are an official minute-taker for the Expert Appraisal Committee (EAC) of the Chhattisgarh Environment Conservation Board (CECB).

Your task is to convert the edited meeting gist into a structured, formal Minutes of Meeting (MoM) document.

APPLICATION DETAILS:
- Project Name: ${input.projectName}
- Sector: ${input.industrySector}
- Category: ${categoryLabel}
${input.location ? `- Location: ${input.location}` : ''}
${input.environmentalRiskSummary ? `\nENVIRONMENTAL RISK CONTEXT:\n${input.environmentalRiskSummary}` : ''}

EDITED MEETING GIST (reviewed and approved by MoM Team):
${input.editedGist}

EXTRACTION INSTRUCTIONS:
1. DISCUSSION SUMMARY: Write a formal paragraph (3+ sentences) summarising what was discussed. Use passive/formal voice. Reference specific environmental parameters, regulatory requirements, and expert concerns mentioned in the gist. Do not add information not present in the gist.

2. COMMITTEE DECISION: Determine the decision from the gist. Choose EXACTLY ONE from: "Approved", "Approved with Conditions", "Deferred", "Rejected", "Pending".
   - If the gist mentions approval with any conditions or restrictions → "Approved with Conditions"
   - If the gist mentions deferral, pending information, or EDS → "Deferred"
   - If the gist mentions rejection or denial → "Rejected"
   - If the gist mentions clean/unconditional approval → "Approved"
   - If the decision is genuinely unclear from the gist → "Pending"

3. CONDITIONS: Extract ALL conditions mentioned in the gist. If none are mentioned but the decision is "Approved" or "Approved with Conditions", include the standard condition: "Compliance with all applicable environmental standards as per EIA Notification 2006 and CECB guidelines."

4. RECOMMENDATIONS: Extract any next steps, monitoring requirements, or advisory notes. If none, leave the array empty.

Important: Extract only what the gist contains. Do not invent details not present in the gist.`,
      output: {
        schema: GenerateMinutesOfMeetingDraftOutputSchema,
      },
      config: {
        temperature: 0,
      },
    });

    if (!output) {
      throw new Error('AI failed to generate MoM draft. Please retry or check the gist content.');
    }

    return output;
  }
);
