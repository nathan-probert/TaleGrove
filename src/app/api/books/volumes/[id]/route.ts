import { NextRequest, NextResponse } from "next/server";

const googleApiKey = process.env.GOOGLE_BOOKS_API_KEY;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!googleApiKey) {
    return NextResponse.json(
      { error: "Missing GOOGLE_BOOKS_API_KEY environment variable." },
      { status: 500 },
    );
  }

  try {
    const res = await fetch(
      `https://www.googleapis.com/books/v1/volumes/${id}?key=${googleApiKey}`,
    );

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
      "Error fetching book from Google Books:",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json(
      { error: "Failed to fetch book from Google Books API." },
      { status: 500 },
    );
  }
}
