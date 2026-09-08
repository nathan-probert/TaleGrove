import { NextRequest, NextResponse } from "next/server";

const googleApiKey = process.env.GOOGLE_BOOKS_API_KEY;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id") || "";
  const title = searchParams.get("title") || "";
  const publisher = searchParams.get("publisher") || "";

  if (!title && !id) {
    return NextResponse.json(
      { error: "At least one of id or title is required." },
      { status: 400 },
    );
  }

  const coverUrls: string[] = [];

  // Add original cover from the item ID if provided
  if (id) {
    const originalCover = `https://books.google.com/books/publisher/content/images/frontcover/${id}?fife=w400-h600&source=gbs_api`;
    coverUrls.push(originalCover);
  }

  // Search Google Books for covers
  if (title && googleApiKey) {
    try {
      let googleQuery = `q=${encodeURIComponent(title)}`;
      if (publisher) {
        googleQuery += `+inpublisher:${encodeURIComponent(publisher)}`;
      }
      const googleRes = await fetch(
        `https://www.googleapis.com/books/v1/volumes?${googleQuery}&key=${googleApiKey}&maxResults=10`,
      );
      if (googleRes.ok) {
        const googleData = await googleRes.json();
        if (googleData.items && googleData.items.length > 0) {
          for (const item of googleData.items) {
            const coverUrl = `https://books.google.com/books/publisher/content/images/frontcover/${item.id}?fife=w400-h600&source=gbs_api`;
            if (!coverUrls.includes(coverUrl)) {
              coverUrls.push(coverUrl);
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching covers from Google Books:", error);
    }
  }

  // Search Open Library for covers
  if (title) {
    try {
      let openLibraryQuery = `title=${encodeURIComponent(title)}`;
      if (publisher) {
        openLibraryQuery += `&publisher=${encodeURIComponent(publisher)}`;
      }
      const openLibraryRes = await fetch(
        `https://openlibrary.org/search.json?${openLibraryQuery}&limit=10`,
      );
      if (openLibraryRes.ok) {
        const openLibraryData = await openLibraryRes.json();
        if (openLibraryData.docs && openLibraryData.docs.length > 0) {
          for (const doc of openLibraryData.docs) {
            if (doc.cover_i) {
              const coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
              if (!coverUrls.includes(coverUrl)) {
                coverUrls.push(coverUrl);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error("Error fetching covers from Open Library:", error);
    }
  }

  return NextResponse.json({ covers: coverUrls });
}
