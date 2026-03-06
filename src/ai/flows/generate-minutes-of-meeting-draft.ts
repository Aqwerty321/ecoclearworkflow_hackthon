'use server';
/**
 * @fileOverview This file implements a Genkit flow for generating a structured draft of the Minutes of Meeting (MoM).
 *
 * - generateMinutesOfMeetingDraft - A function that initiates the MoM draft generation process.
 * - GenerateMinutesOfMeetingDraftInput - The input type for the generateMinutesOfMeetingDraft function.
 * - GenerateMinutesOfMeetingDraftOutput - The return type for the generateMinutesOfMeetingDraft function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

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
    .describe('A summary of environmental risks associated with the project.'),
});

export type GenerateMinutesOfMeetingDraftInput = z.infer<
  typeof GenerateMinutesOfMeetingDraftInputSchema
>;

const GenerateMinutesOfMeetingDraftOutputSchema = z.object({
  projectName: z.string().describe('The name of the project.'),
  discussionSummary: z
    .string()
    .describe('A concise summary of the key points discussed during the meeting.'),
  committeeDecision: z
    .string()
    .describe('The final decision made by the committee regarding the application.'),
  conditions: z
    .array(z.string())
    .describe('A list of conditions or stipulations imposed by the committee.'),
  recommendations: z
    .array(z.string())
    .optional()
    .describe('Optional recommendations or next steps suggested.'),
});

export type GenerateMinutesOfMeetingDraftOutput = z.infer<
  typeof GenerateMinutesOfMeetingDraftOutputSchema
>;

export async function generateMinutesOfMeetingDraft(
  input: GenerateMinutesOfMeetingDraftInput
): Promise<GenerateMinutesOfMeetingDraftOutput> {
  return generateMinutesOfMeetingDraftFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMinutesOfMeetingDraftPrompt',
  input: {schema: GenerateMinutesOfMeetingDraftInputSchema},
  output: {schema: GenerateMinutesOfMeetingDraftOutputSchema},
  prompt: `You are an AI assistant tasked with converting an edited meeting gist into a structured Minutes of Meeting (MoM) document.

Extract the relevant information from the provided gist and structure it according to the specified output schema. Focus on capturing the project details, key discussion points, the committee's decision, and any imposed conditions or recommendations.

Application Details:
Project Name: {{{projectName}}}
Industry Sector: {{{industrySector}}}
Category: {{{category}}}
{{#if location}}Location: {{{location}}}{{/if}}
{{#if environmentalRiskSummary}}Environmental Risk Summary: {{{environmentalRiskSummary}}}{{/if}}

Edited Meeting Gist:
{{{editedGist}}}`,
});

const generateMinutesOfMeetingDraftFlow = ai.defineFlow(
  {
    name: 'generateMinutesOfMeetingDraftFlow',
    inputSchema: GenerateMinutesOfMeetingDraftInputSchema,
    outputSchema: GenerateMinutesOfMeetingDraftOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
