import { BookRecommendation } from '@/types';
import { GoogleGenerativeAI, GenerationConfig } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
}

const genAI = new GoogleGenerativeAI(apiKey);

const generationConfig: GenerationConfig = {
    responseMimeType: "application/json",
};

export const model = genAI.getGenerativeModel({
    model: 'gemini-pro',
    generationConfig,
});


function _adjustPromptForUseCase(prompt: string): string {
    return `Based *only* on the provided JSON data, recommend exactly ten books.
    Return the recommendations as a JSON array of objects, where each object strictly adheres to the following schema: { "title": string, "author": string }.
    Do not include any introductory text, explanations, or concluding remarks outside the JSON array.
    Here is the JSON data:
    ${prompt}`;
}

function _isValidBookRecommendationArray(data: unknown): data is BookRecommendation[] {
    return (
        Array.isArray(data) &&
        data.length === 10 &&
        data.every(
            (item) =>
                typeof item === 'object' &&
                item !== null &&
                typeof item.title === 'string' &&
                typeof item.author === 'string'
        )
    );
}


export async function generateContent(prompt: string): Promise<BookRecommendation[]> {
    const adjustedPrompt = _adjustPromptForUseCase(prompt);

    try {
        const result = await model.generateContent(adjustedPrompt);
        const text = result.response.text();

        // Parse the JSON response (JSON mode should ensure it's valid JSON)
        let parsedResponse: unknown;
        try {
            parsedResponse = JSON.parse(text);
        } catch (error) {
            console.error('Failed to parse JSON response:', text, error);
            throw new Error('AI model returned invalid JSON.');
        }

        if (!_isValidBookRecommendationArray(parsedResponse)) {
            console.error('Invalid response structure:', parsedResponse);
            throw new Error('AI model response did not match the expected schema.');
        }

        return parsedResponse as BookRecommendation[];

    } catch (error) {
        if (error instanceof Error) {
            console.error(`Error generating content: ${error.message}`);
        } else {
            console.error('An unknown error occurred during content generation:', error);
        }
        throw new Error('Failed to generate content from AI model.');
    }
}