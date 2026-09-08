import { NextRequest, NextResponse } from "next/server";

const googleApiKey =
  process.env.GOOGLE_BOOKS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "";
  const author = searchParams.get("author") || "";
  const maxResults = searchParams.get("maxResults") || "15";

  if (!googleApiKey) {
    return NextResponse.json(
      { error: "Missing GOOGLE_BOOKS_API_KEY environment variable." },
      { status: 500 },
    );
  }

  try {
    const queryParts = [];
    if (title) queryParts.push(`intitle:${encodeURIComponent(title)}`);
    if (author) queryParts.push(`inauthor:${encodeURIComponent(author)}`);

    if (queryParts.length === 0) {
      return NextResponse.json(
        { error: "At least one of title or author is required." },
        { status: 400 },
      );
    }

    const query = `q=${queryParts.join("+")}`;
    const fields =
      "items(id,volumeInfo(title,authors,description,categories))";
    const url = `https://www.googleapis.com/books/v1/volumes?${query}&maxResults=${maxResults}&langRestrict=en&fields=${encodeURIComponent(fields)}&key=${googleApiKey}`;

    const res = await fetch(url);

    if (!res.ok) {
      return NextResponse.json(
        { error: `Google Books API returned status ${res.status}` },
        { status: res.status },
      );
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error(
      "Error searching Google Books:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: "Failed to search Google Books API." },
      { status: 500 },
    );
  }
}
