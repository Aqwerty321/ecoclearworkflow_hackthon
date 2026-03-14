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
  documentUrls:
    z.array(z.string().describe("A document's content as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."))
      .min(1, 'At least one document URL is required.')
      .describe('An array of data URIs for the documents to be analyzed.'),
});
export type ScrutinyDocumentSummaryAndFlaggingInput = z.infer<typeof ScrutinyDocumentSummaryAndFlaggingInputSchema>;

// 2. Define Output Schema
const ScrutinyDocumentSummaryAndFlaggingOutputSchema = z.object({
  summary: z.string().describe('A concise summary of all the uploaded documents.'),
  complianceIssues:
    z.array(z.string())
      .describe(
        'An array of identified potential areas of non-compliance with environmental regulations or best practices, or specific missing/incomplete information required for an environmental clearance application.'
      ),
  potentialImpacts:
    z.array(z.string())
      .describe('An array of suggested potential environmental impacts relevant to the project, based on the provided documents and project description.'),
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
    const { projectDescription, documentUrls } = input;

    // Construct the prompt parts for the AI model, including the project description and document media.
    const promptParts = [
      {
        text: `As an AI-powered environmental scrutiny assistant, your task is to analyze the provided project description and a series of uploaded documents.
        
Project Description: "${projectDescription}"

Based on the project description and the content of the documents, perform the following:
1. Generate a concise summary of all the uploaded documents.
2. Identify any potential areas of non-compliance with typical environmental regulations or best practices, or specific missing information that would typically be required for an environmental clearance application.
3. Suggest potential environmental impacts that this project might have, even if not explicitly stated in the documents.

Ensure your output strictly adheres to the JSON schema provided.`,
      },
      ...documentUrls.map((url) => {
        // text/plain data URIs must be passed as text parts, not media parts —
        // Gemini media parts are for binary content (images, PDFs).
        if (url.startsWith('data:text/plain;base64,')) {
          const decoded = Buffer.from(url.replace('data:text/plain;base64,', ''), 'base64').toString('utf-8');
          return { text: `\n\nDocument content:\n${decoded}` };
        }
        return { media: { url: url } };
      }),
    ];

    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash', // Must match the model registered in genkit.ts
      prompt: promptParts,
      output: {
        schema: ScrutinyDocumentSummaryAndFlaggingOutputSchema,
      },
      config: {
        temperature: 0.2, // Keeping the temperature low for factual and focused analysis.
      },
    });

    if (!output) {
      throw new Error('AI failed to generate a valid output.');
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
