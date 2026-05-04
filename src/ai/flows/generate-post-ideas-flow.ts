'use server';
/**
 * @fileOverview This file implements a Genkit flow for generating post ideas or enhancing existing post text.
 *
 * - generatePostIdeas - A function that handles the generation of post ideas.
 * - GeneratePostIdeasInput - The input type for the generatePostIdeas function.
 * - GeneratePostIdeasOutput - The return type for the generatePostIdeas function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GeneratePostIdeasInputSchema = z.object({
  topic: z.string().optional().describe('The main topic or keyword for the post/joke ideas.'),
  postText: z.string().optional().describe('Existing post text to enhance or build upon.'),
  tone: z.string().optional().describe('The desired tone for the generated ideas (e.g., "funny", "sarcastic", "clever", "witty").'),
});
export type GeneratePostIdeasInput = z.infer<typeof GeneratePostIdeasInputSchema>;

const GeneratePostIdeasOutputSchema = z.object({
  ideas: z.array(z.string()).describe('An array of creative joke ideas or enhanced post text suggestions.'),
  suggestions: z.string().optional().describe('Additional general suggestions or elaborations on the generated ideas.'),
});
export type GeneratePostIdeasOutput = z.infer<typeof GeneratePostIdeasOutputSchema>;

export async function generatePostIdeas(input: GeneratePostIdeasInput): Promise<GeneratePostIdeasOutput> {
  return generatePostIdeasFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generatePostIdeasPrompt',
  input: { schema: GeneratePostIdeasInputSchema },
  output: { schema: GeneratePostIdeasOutputSchema },
  prompt: `You are a creative content assistant for a social media platform called "Noktek - نُكتك". Your goal is to help users brainstorm engaging post ideas, especially jokes, or enhance their existing text.

Instructions:
- If 'postText' is provided, enhance it with creative suggestions, making it funnier or more engaging based on the 'tone'.
- If only 'topic' is provided, generate several creative and original joke ideas or engaging post concepts related to the topic.
- Aim for lighthearted, clever, and shareable content.
- Ensure the output is a JSON object matching the specified output schema.

Input Details:
{{#if topic}}Topic: {{{topic}}}{{/if}}
{{#if postText}}Existing Post Text: {{{postText}}}{{/if}}
{{#if tone}}Desired Tone: {{{tone}}}{{/if}}
`,
});

const generatePostIdeasFlow = ai.defineFlow(
  {
    name: 'generatePostIdeasFlow',
    inputSchema: GeneratePostIdeasInputSchema,
    outputSchema: GeneratePostIdeasOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
