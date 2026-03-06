'use server';
/**
 * @fileOverview A Genkit flow for generating an initial meeting gist based on application details.
 *
 * - generateMeetingGist - A function that handles the meeting gist generation process.
 * - GenerateMeetingGistInput - The input type for the generateMeetingGist function.
 * - GenerateMeetingGistOutput - The return type for the generateMeetingGist function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateMeetingGistInputSchema = z.object({
  projectName: z.string().describe('The name of the project.'),
  industrySector: z.string().describe('The industry sector of the project.'),
  category: z.string().describe('The application category (e.g., A, B1, B2).'),
  projectDescription: z
    .string()
    .describe('A detailed description of the project.'),
});
export type GenerateMeetingGistInput = z.infer<
  typeof GenerateMeetingGistInputSchema
>;

const GenerateMeetingGistOutputSchema = z.string().describe('The generated meeting gist.');
export type GenerateMeetingGistOutput = z.infer<
  typeof GenerateMeetingGistOutputSchema
>;

export async function generateMeetingGist(
  input: GenerateMeetingGistInput
): Promise<GenerateMeetingGistOutput> {
  return generateMeetingGistFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateMeetingGistPrompt',
  input: { schema: GenerateMeetingGistInputSchema },
  output: { schema: GenerateMeetingGistOutputSchema },
  prompt: `You are an AI assistant tasked with generating a concise meeting gist based on environmental application details.
Your goal is to provide a quick and relevant starting point for meeting discussions.

Generate a summary that includes the Project Name, Industry Sector, Application Category, and a brief overview of the Project Description.
Focus on key aspects that would be relevant for an initial discussion.

Project Name: {{{projectName}}}
Industry Sector: {{{industrySector}}}
Application Category: {{{category}}}
Project Description: {{{projectDescription}}}`,
});

const generateMeetingGistFlow = ai.defineFlow(
  {
    name: 'generateMeetingGistFlow',
    inputSchema: GenerateMeetingGistInputSchema,
    outputSchema: GenerateMeetingGistOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
