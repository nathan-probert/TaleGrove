import { BookRecommendation } from '@/types';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { exit } from 'process';

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY environment variable.");
}

const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "models/gemini-1.5-flash",
});

function _createPrompt(userData: string, recommendationData: string): string {
    return `You are a recommendation engine.
    Based *only* on the provided JSON data, recommend exactly ten new books that meet ALL these criteria:
    1. Not in the user's read/rated books or wishlist
    2. Not in any previous declined recommendations
    3. Never mentioned in either JSON input below
    Return recommendations strictly as a JSON array of objects in this format: { "title": string, "author": string }.
    No explanations. Only the JSON array.
    
    User data (reads/wishlist/ratings):
    ${userData}
    
    Declined recommendations (DO NOT SUGGEST THESE):
    ${recommendationData}`;
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

// 🧼 Clean up markdown-style formatting from AI response
function _cleanJsonResponse(response: string): string {
    return response.replace(/```json|```/g, '').trim();
}

export async function _generateContent(userData: string, recommendationData: string): Promise<BookRecommendation[]> {
    const prompt = _createPrompt(userData, recommendationData);

    try {
        const result = await model.generateContent({
            contents: [
                {
                    role: 'user',
                    parts: [{ text: prompt }],
                },
            ],
        });

        const rawText = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const cleanedText = _cleanJsonResponse(rawText);

        let parsedResponse: unknown;
        try {
            parsedResponse = JSON.parse(cleanedText);
        } catch (error) {
            console.error('Failed to parse JSON response:', rawText, error);
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

export async function generateRecommendations(userData: BookRecommendation[], oldRecommendations: BookRecommendation[]): Promise<BookRecommendation[]> {
    const jsonUserData = JSON.stringify(userData);
    const jsonOldRecommendations = JSON.stringify(oldRecommendations);
    return await _generateContent(jsonUserData, jsonOldRecommendations);
}
