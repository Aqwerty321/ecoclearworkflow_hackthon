'use server';
/**
 * @fileOverview RegBot — AI regulation assistant for CECB EcoClear.
 *
 * Provides conversational Q&A about Environmental Clearance regulations,
 * CECB jurisdiction, EC categories, required documents, and standard conditions.
 *
 * - regulationAssistant - Multi-turn chat handler
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const RegulationAssistantInputSchema = z.object({
  messages: z.array(MessageSchema).describe('Full conversation history (role + content pairs).'),
  context: z.object({
    sector: z.string().optional(),
    category: z.enum(['A', 'B1', 'B2']).optional(),
    userRole: z.string().optional(),
  }).optional(),
});

export type RegulationAssistantInput = z.infer<typeof RegulationAssistantInputSchema>;

const OutputSchema = z.string();

export async function regulationAssistant(input: RegulationAssistantInput): Promise<string> {
  return regulationAssistantFlow(input);
}

const SYSTEM_PROMPT = `You are RegBot, an expert AI regulation assistant for the Chhattisgarh Environment Conservation Board (CECB). You help project proponents, environmental officers, and committee members understand Environmental Clearance (EC) regulations.

Your knowledge covers:
- CECB jurisdiction and mandate under the Environment Protection Act (EPA) 1986
- EC Categories: A (High Impact, SEIAA-level clearance, mandatory full EIA), B1 (Medium Impact, scoped EIA required), B2 (Low Impact, Form 1 + project brief only)
- Standard processing timelines: B2 ~30 days, B1 ~60 days, Category A ~90–120 days after complete submission
- EIA Notification 2006 (as amended) — project schedule, threshold values, exemptions
- Public Hearing triggers: mandatory for Category A and most Category B1 projects with significant public interface
- Required documents: Form 1 (all categories), Form 1A (Category A/B1), Full EIA Report (Category A), Scoped EIA (Category B1), Project Brief (Category B2), NOC from local body, land use certificate, site plan, Pollution Control consent
- Sector-specific additions: Mining → Mining Plan + Reclamation Plan; Energy → Stack Emission Data + EMP; Infrastructure → Traffic Impact Assessment; Manufacturing → Hazardous waste management plan
- Standard EC conditions commonly imposed: real-time effluent monitoring, greenbelt of minimum 33% area, community development fund (1% of project cost), quarterly environmental compliance reports, rainwater harvesting mandatory for >1000 sqm built-up area
- CECB office: Paryavaran Bhawan, Raipur, Chhattisgarh — contact cecb-cg@gov.in

Guidelines:
- Answer clearly and concisely. Use bullet lists for multi-part answers.
- If asked about a specific project, ask for sector and category first.
- Always cite the relevant regulation or notification when possible.
- Do not fabricate case-specific legal outcomes — direct users to CECB officers for binding decisions.
- Respond in the same language as the user (English or Hindi).`;

const regulationAssistantFlow = ai.defineFlow(
  {
    name: 'regulationAssistant',
    inputSchema: RegulationAssistantInputSchema,
    outputSchema: OutputSchema,
  },
  async (input) => {
    // Build the conversation prompt: system context + history + latest user turn
    const history = input.messages.slice(0, -1); // all but last
    const lastMessage = input.messages[input.messages.length - 1];

    const contextNote = input.context
      ? `\n\n[Context — Sector: ${input.context.sector ?? 'unspecified'}, Category: ${input.context.category ?? 'unspecified'}, User role: ${input.context.userRole ?? 'unspecified'}]`
      : '';

    const historyText = history
      .map(m => `${m.role === 'user' ? 'User' : 'RegBot'}: ${m.content}`)
      .join('\n');

    const prompt = `${SYSTEM_PROMPT}${contextNote}

${historyText ? `Conversation so far:\n${historyText}\n\n` : ''}User: ${lastMessage.content}

RegBot:`;

    const { output } = await ai.generate({
      model: 'googleai/gemini-2.5-flash',
      prompt,
      output: { schema: OutputSchema },
      config: { temperature: 0.3 },
    });

    if (!output) throw new Error('RegBot AI failed to generate a response.');
    return output;
  }
);
