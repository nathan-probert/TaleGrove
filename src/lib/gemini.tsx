import { BookRecommendation } from '@/types';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
if (!apiKey) {
  throw new Error("Missing GEMINI_API_KEY environment variable.");
}

const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "models/gemini-2.0-flash",
});

// Prompt for single user recommendations
function _createPrompt(userData: string, recommendationData: string): string {
  return `You are a highly intelligent book recommendation engine.
  
  Using ONLY the JSON data below, recommend EXACTLY 10 unique books that satisfy ALL of the following conditions:
  
  1. The book is NOT in the user's read, rated, wishlist, or currently reading list ("UserBooks").
  2. The book is NOT in the declined recommendations list ("DeclinedBooks").
  
  Your output must be a single valid JSON array with this precise format:
  [
    { "title": "Book Title", "author": "Author Name" },
    ...
  ]
  
  Return ONLY the JSON array—no extra text, notes, or explanations.
  
  ---
  
  "UserBooks": ${userData}
  
  "DeclinedBooks": ${recommendationData}`;
}

function _createGroupPrompt(
  allMemberBooksData: string[],
  allRecommendationsData: string[]
): string {
  let prompt = `You are a highly intelligent book recommendation engine specializing in group recommendations.

  Using ONLY the JSON data below, which includes EACH group member’s book lists and previously declined recommendations, suggest EXACTLY 10 unique books that are suitable for EVERYONE in the group.

  You MUST consider each member INDIVIDUALLY. The final list must ONLY include books that:
  1. Do NOT appear in ANY member's "GroupMemberBooks" list (books they’ve read, rated, wishlisted, or are currently reading).
  2. Do NOT appear in ANY member's "DeclinedGroupRecommendations" list.
  3. Are likely to appeal to ALL members based on their individual books and preferences.
  4. Do NOT favor users with more data—treat ALL members as equally important, regardless of how many books they’ve listed.

  Your output MUST be a single valid JSON array with this exact format:
  [
    { "title": "Book Title", "author": "Author Name" },
    ...
  ]

  Return ONLY the JSON array—no extra text, notes, or explanations.

  ---
  `;

  for (let i = 0; i < allMemberBooksData.length; i++) {
    prompt += `Person ${i + 1}:
  "GroupMemberBooks": ${allMemberBooksData[i]}
  "DeclinedGroupRecommendations": ${allRecommendationsData[i]}

  `;
  }

  return prompt;
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

// Updated to accept the prompt directly
async function _generateContent(prompt: string): Promise<BookRecommendation[]> {
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
  // Create the prompt for single user
  const prompt = _createPrompt(jsonUserData, jsonOldRecommendations);
  return await _generateContent(prompt);
}

export async function generateGroupRecommendations(
  allMemberBooks: BookRecommendation[][],
  allRecommendations: BookRecommendation[][]
): Promise<BookRecommendation[]> {
  const prompt = _createGroupPrompt(
    allMemberBooks.map(memberBooks => JSON.stringify(memberBooks)),
    allRecommendations.map(declinedBooks => JSON.stringify(declinedBooks))
  );
  
  return await _generateContent(prompt);
}
