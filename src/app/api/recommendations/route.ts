import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { BookRecommendation } from "@/types";

function _createPrompt(userData: string, recommendationData: string): string {
  return `You are a highly intelligent book recommendation engine.
  
  Using ONLY the JSON data below, recommend EXACTLY 10 unique books that satisfy ALL of the following conditions:
  
  1. The book is NOT in the user's read, rated, wishlist, or currently reading list.
  2. The book is NOT in the declined recommendations list.
  3. The book is NOT mentioned in either JSON dataset in any way.
  
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

function _isValidBookRecommendationArray(
  data: unknown,
): data is BookRecommendation[] {
  return (
    Array.isArray(data) &&
    data.length === 10 &&
    data.every(
      (item) =>
        typeof item === "object" &&
        item !== null &&
        typeof item.title === "string" &&
        typeof item.author === "string",
    )
  );
}

function _cleanJsonResponse(response: string): string {
  return response.replace(/```json|```/g, "").trim();
}

export async function POST(request: NextRequest) {
  try {
    const apiKey =
      process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY environment variable." },
        { status: 500 },
      );
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "models/gemini-3.1-flash-lite",
    });

    const { userData, oldRecommendations } = await request.json();

    const prompt = _createPrompt(
      JSON.stringify(userData),
      JSON.stringify(oldRecommendations),
    );

    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
    });

    const rawText =
      result.response.candidates?.[0]?.content?.parts?.[0]?.text || "";
    const cleanedText = _cleanJsonResponse(rawText);

    let parsedResponse: unknown;
    try {
      parsedResponse = JSON.parse(cleanedText);
    } catch {
      console.error("Failed to parse JSON response:", rawText);
      return NextResponse.json(
        { error: "AI model returned invalid JSON." },
        { status: 500 },
      );
    }

    if (!_isValidBookRecommendationArray(parsedResponse)) {
      console.error("Invalid response structure:", parsedResponse);
      return NextResponse.json(
        { error: "AI model response did not match the expected schema." },
        { status: 500 },
      );
    }

    return NextResponse.json(parsedResponse);
  } catch (error) {
    console.error(
      "Error generating recommendations:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: "Failed to generate content from AI model." },
      { status: 500 },
    );
  }
}
