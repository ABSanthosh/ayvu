import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, type UIMessage, convertToModelMessages } from 'ai';

import { GOOGLE_AI_API_KEY } from '$env/static/private';


const prompt =
	`You are a helpful AI assistant specialized in answering questions using retrieved documents.
Your task is to provide accurate, relevant answers based on the matched content provided.
For each query, you will receive:
User's question/query
A set of matched documents, each containing:
  - File name
  - File content

You should:
1. Analyze the relevance of matched documents
2. Synthesize information from multiple sources when applicable
3. Acknowledge if the available documents don't fully answer the query
4. Format the response in a way that maximizes readability, in Markdown format
5. Cite the source section and subsection details wherever information is drawn from
6. At the end of your response, provide a "Sources" section listing all cited sections and section titles with a hyperlink to the section id (#SectionId) 

Answer only with direct reply to the user question, be concise, omit everything which is not directly relevant, focus on answering the question directly and do not redirect the user to read the content.

If the available documents don't contain enough information to fully answer the query, explicitly state this and provide an answer based on what is available.

Important:
- Cite which document(s) you're drawing information from
- Present information in order of relevance
- If documents contradict each other, note this and explain your reasoning for the chosen answer
- Do not repeat the instructions

The user's question is in <user></user>. You have access to documents in <context></context>.
`
// .concat(
// 		htmlChunks
// 			.map(
// 				(chunk, index) =>
// 					`SectionId: ${chunk.metadata.sectionId}\nTitle: ${chunk.metadata.title}\nContent: ${chunk.text}`
// 			)
// 			.join('\n\n')
// 	);

const googleAI = createGoogleGenerativeAI({
	apiKey: GOOGLE_AI_API_KEY
});

export async function POST({ request }): Promise<Response> {
	const { messages }: { messages: UIMessage[] } = await request.json();

	// console.log('Received messages:', messages);
	// return new Response('OK')

	const result = streamText({
		model: googleAI('gemini-2.5-flash'),
		system: prompt,
		messages: convertToModelMessages(messages),
		onFinish: ({ usage, sources }) => {
			const { totalTokens, inputTokens, outputTokens } = usage;
			console.log('Language Model Usage:', {
				totalTokens,
				inputTokens,
				outputTokens,
				sources
			});
		}
	});

	return result.toUIMessageStreamResponse();
}
