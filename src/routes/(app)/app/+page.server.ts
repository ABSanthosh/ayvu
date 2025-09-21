// import * as mupdfjs from 'mupdf/mupdfjs';
import type { Actions, PageServerLoad } from './$types';
import { uploadPdf } from '$lib/drive';
import nanoid from '$utils/nanoid';
import { fail } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
	const papers = [
		{
			id: 1,
			title: 'LLM4DS: Evaluating Large Language Models for Data Science Code Generation',
			authors: [
				'Nathalia Nascimento',
				'Everton Guimaraes',
				'Sai Sanjna Chintakunta',
				'Santhosh Anitha Boominathan'
			],
			published: 'Nov 2024',
			abstract: `The adoption of Large Language Models (LLMs) for code generation in data science offers substantial potential for enhancing tasks such as data manipulation, statistical analysis, and visualization. However, the effectiveness of these models in the data science domain remains underexplored. This paper presents a controlled experiment that empirically assesses the performance of four leading LLM-based AI assistants-Microsoft Copilot (GPT-4 Turbo), ChatGPT (o1-preview), Claude (3.5 Sonnet), and Perplexity Labs (Llama-3.1-70b-instruct)-on a diverse set of data science coding challenges sourced from the Stratacratch platform. Using the Goal-Question-Metric (GQM) approach, we evaluated each model's effectiveness across task types (Analytical, Algorithm, Visualization) and varying difficulty levels. Our findings reveal that all models exceeded a 50% baseline success rate, confirming their capability beyond random chance. Notably, only ChatGPT and Claude achieved success rates significantly above a 60% baseline, though none of the models reached a 70% threshold, indicating limitations in higher standards. ChatGPT demonstrated consistent performance across varying difficulty levels, while Claude's success rate fluctuated with task complexity. Hypothesis testing indicates that task type does not significantly impact success rate overall. For analytical tasks, efficiency analysis shows no significant differences in execution times, though ChatGPT tended to be slower and less predictable despite high success rates. This study provides a structured, empirical evaluation of LLMs in data science, delivering insights that support informed model selection tailored to specific task demands. Our findings establish a framework for future AI assessments, emphasizing the value of rigorous evaluation beyond basic accuracy measures.`,
			preview: 'src'
		},
		{
			id: 2,
			title: 'Firecracker: Lightweight Virtualization for Serverless Applications',
			authors: ['Michael Clark', 'Sergey Klimov', 'Andrea Mognon', 'Andrea Rosa', 'Felipe Huici'],
			published: 'Feb 2020',
			abstract:
				'Serverless containers and functions are widely used for deploying and managing software in the cloud. Their popularity is due to reduced cost of operations, improved utilization of hardware, and faster scaling than traditional deployment methods. The economics and scale of serverless applications demand that workloads from multiple customers run on the same hardware with minimal overhead, while preserving strong security and performance isolation. The traditional view is that there is a choice between virtualization with strong security and high overhead, and container technologies with weaker security and minimal overhead. This tradeoff is unacceptable to public infrastructure providers, who need both strong security and minimal overhead. To meet this need, we developed Firecracker, a new open source Virtual Machine Monitor (VMM) specialized for serverless workloads, but generally useful for containers, functions and other compute workloads within a reasonable set of constraints. We have deployed Firecracker in two publically-available serverless compute services at AWS (Lambda and Fargate), where it supports millions of production workloads, and trillions of requests per month. We describe how specializing for serverless informed the design of Firecracker, and what we learned from seamlessly migrating AWS Lambda customers to Firecracker.',
			preview: 'src'
		}
	];

	return {
		papers
	};
};

export const actions: Actions = {
	// createEntry: async ({ request, locals }) => {
	// 	const data = await request.formData();
	// 	const fileName = nanoid();
	// 	const pdFile = data.get('pdf')! as File;
	// 	const pageCount = mupdfjs.PDFDocument.openDocument(
	// 		await pdFile.arrayBuffer(),
	// 		'application/pdf'
	// 	).countPages();
	// 	console.log(pageCount);

	// 	if (pageCount > 25) {
	// 		return fail(406, {
	// 			error: {
	// 				pdf: 'Pdf file cannot have more than 25 pages.'
	// 			}
	// 		});
	// 	}
	// 	try {
	// 		const { fileId, webViewLink } = await uploadPdf(
	// 			pdFile,
	// 			fileName,
	// 			locals.user?.accessToken!,
	// 			locals.user?.refreshToken!
	// 		);
	// 	} catch (error) {
	// 		console.error('Upload failed:', error);
	// 	}
	// }
};
