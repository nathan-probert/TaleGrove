import {
  Author,
  BookFromAPI,
  GoogleBooksVolume,
  IndustryIdentifier,
  OpenLibraryDoc,
  OpenLibraryRecommendationInfo,
} from "@/types";

const useGoogle = true;

function _parseCategories(categories: string[]): string[] {
  const tags = new Set<string>();

  for (const category of categories) {
    const parts = category.split("/").map((p) => p.trim());
    parts.forEach((part) => tags.add(part));
  }

  const cleanedTags = Array.from(tags);
  return cleanedTags;
}

function googleToGeneral(fetchedItem: GoogleBooksVolume): BookFromAPI {
  const volumeInfo = fetchedItem.volumeInfo || {};

  let foundIsbn: string | null = null;
  if (volumeInfo.IndustryIdentifiers) {
    const isbn13 = volumeInfo.IndustryIdentifiers.find(
      (id: IndustryIdentifier) => id.type === "ISBN_13",
    );
    const isbn10 = volumeInfo.IndustryIdentifiers.find(
      (id: IndustryIdentifier) => id.type === "ISBN_10",
    );
    foundIsbn = isbn13?.identifier ?? isbn10?.identifier ?? null;
  }

  const categories = volumeInfo.categories
    ? _parseCategories(volumeInfo.categories)
    : [];

  return {
    id: fetchedItem.id,
    title: volumeInfo.title || "No Title",
    authors: volumeInfo.authors
      ? volumeInfo.authors.join(", ")
      : "Unknown Author",
    description: volumeInfo["description"] || "No Description",
    categories: categories ?? [],
    isbn: foundIsbn ?? "",
  } as BookFromAPI;
}

async function openLibraryToGeneral(
  fetchedItem: OpenLibraryDoc,
): Promise<BookFromAPI> {
  const title = fetchedItem.title ?? "Unknown Title";
  const description = fetchedItem.description ?? "No description available.";

  // Get author names
  const authorKeys = (fetchedItem.authors ?? ([] satisfies Author[])).map(
    (a) => a.author.key,
  );
  const authors = await Promise.all(
    authorKeys.map(async (key: string) => {
      const res = await fetch(`https://openlibrary.org${key}.json`);
      if (!res.ok) {
        console.warn(
          `OpenLibrary author fetch failed: ${res.status} for key ${key}`,
        );
        return "Unknown Author";
      }
      const data = await res.json();
      return data.name ?? "Unknown Author";
    }),
  );

  // Get ISBNs from first edition
  const editionRes = await fetch(
    `https://openlibrary.org/works/${fetchedItem.id}/editions.json?limit=1`,
  );
  let isbn = "No ISBN available";
  if (!editionRes.ok) {
    console.warn(
      `OpenLibrary editions fetch failed: ${editionRes.status} for work ${fetchedItem.id}`,
    );
  } else {
    const editionData = await editionRes.json();
    const firstEdition = editionData.entries?.[0];
    isbn =
      firstEdition?.isbn_13?.[0] ??
      firstEdition?.isbn_10?.[0] ??
      "No ISBN available";
  }

  return {
    id: fetchedItem.id,
    title,
    authors: authors.join(", "),
    description,
    isbn,
  } as BookFromAPI;
}

export async function getBookFromAPI(id: string): Promise<BookFromAPI> {
  if (useGoogle) {
    const res = await fetch(`/api/books/volumes/${id}`);
    const fetchedItem = await res.json();
    return googleToGeneral(fetchedItem);
  } else {
    const workRes = await fetch(`https://openlibrary.org/works/${id}.json`);
    if (!workRes.ok) {
      throw new Error(
        `OpenLibrary work fetch failed: ${workRes.status} for id ${id}`,
      );
    }
    const fetchedItem = await workRes.json();
    return await openLibraryToGeneral(fetchedItem);
  }
}

export function getCoverUrl(id: string): string {
  if (useGoogle) {
    return `https://books.google.com/books/publisher/content/images/frontcover/${id}?fife=w400-h600&source=gbs_api`;
  } else {
    return `https://covers.openlibrary.org/b/isbn/${id}-L.jpg`;
  }
}

export async function searchForBooks(
  title: string,
  author: string,
  maxResults: number = 15,
): Promise<BookFromAPI[]> {
  if (useGoogle) {
    const params = new URLSearchParams();
    if (title) params.set("title", title);
    if (author) params.set("author", author);
    params.set("maxResults", String(maxResults));

    const res = await fetch(`/api/books/search?${params.toString()}`);
    const fetchedItems = await res.json();

    const processedResults: BookFromAPI[] = [];
    if (!fetchedItems.items) {
      console.error("No items found in the response.");
      return processedResults;
    }
    for (const item of fetchedItems.items) {
      processedResults.push(googleToGeneral(item));
    }

    return processedResults;
  } else {
    const queryParts = [];
    if (title) queryParts.push(`title=${encodeURIComponent(title)}`);
    if (author) queryParts.push(`author=${encodeURIComponent(author)}`);

    const query = queryParts.join("&");

    const url = `https://openlibrary.org/search.json?${query}&limit=${maxResults}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`OpenLibrary search failed: ${res.status}`);
    }

    const data = await res.json();

    const books = await Promise.all(
      data.docs.slice(0, maxResults).map(async (doc: OpenLibraryDoc) => {
        const bookId = doc.key?.replace("/works/", "");
        const title = doc.title ?? "Unknown Title";
        const authors = doc.authors?.join(", ") ?? "Unknown Author";

        return await _getOpenLibraryBookData(bookId, title, authors);
      }),
    );

    return books;
  }
}

async function _getOpenLibraryBookData(
  bookId: string,
  title: string,
  authors: string,
): Promise<BookFromAPI> {
  const editionRes = await fetch(
    `https://openlibrary.org/works/${bookId}/editions.json?limit=1`,
  );
  if (!editionRes.ok) {
    console.warn(
      `OpenLibrary work fetch failed: ${editionRes.status} for id ${bookId}`,
    );
    return {
      id: bookId,
      title: title,
      authors: authors,
      description: "No description available.",
      isbn: "No ISBN available",
    } as BookFromAPI;
  }
  const editionData = await editionRes.json();
  const firstEdition = editionData.entries?.[0];
  const isbn =
    firstEdition?.isbn_13?.[0] ??
    firstEdition?.isbn_10?.[0] ??
    "No ISBN available";

  // description has to be fetched separately so avoid for search
  return {
    id: bookId,
    title: title,
    authors: authors,
    description: "No description available.",
    isbn: isbn,
  } as BookFromAPI;
}

export async function getOpenLibraryRecommendation(
  title: string,
  author: string,
  maxResults = 1,
): Promise<OpenLibraryRecommendationInfo> {
  const queryParts = [];
  if (title) queryParts.push(`title=${encodeURIComponent(title)}`);
  if (author) queryParts.push(`author=${encodeURIComponent(author)}`);

  const ol_query = queryParts.join("&");

  const ol_url = `https://openlibrary.org/search.json?${ol_query}&limit=${maxResults}`;

  let ol_res = await fetch(ol_url);
  if (!ol_res.ok) {
    throw new Error(`OpenLibrary search failed: ${ol_res.status}`);
  }
  let ol_data = await ol_res.json();
  // Use the server-side API route for Google Books
  const g_params = new URLSearchParams();
  if (title) g_params.set("title", title);
  if (author) g_params.set("author", author);
  g_params.set("maxResults", "15");
  const g_res = await fetch(`/api/books/search?${g_params.toString()}`);
  const g_data = await g_res.json();

  if (ol_data.docs.length === 0) {
    // try removing author from query
    const ol_query_no_author = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&limit=${maxResults}`;
    ol_res = await fetch(ol_query_no_author);
    if (!ol_res.ok) {
      throw new Error(`OpenLibrary search retry failed: ${ol_res.status}`);
    }
    ol_data = await ol_res.json();
    if (ol_data.docs.length === 0) {
      throw new Error(
        "No results found in OpenLibrary for the given title and author.",
      );
    }
  }

  // get description from openlibrary
  const ol_doc = ol_data.docs[0];
  const ol_bookId = ol_doc.key?.replace("/works/", "");
  const ol_book_url = `https://openlibrary.org/works/${ol_bookId}.json`;

  const bookRes = await fetch(ol_book_url);
  let bookData: { description?: string | { value?: string } } = {};
  if (!bookRes.ok) {
    console.warn(
      `OpenLibrary work fetch failed: ${bookRes.status} for id ${ol_bookId}`,
    );
  } else {
    bookData = await bookRes.json();
  }
  let description = null;
  if (bookData.description) {
    if (typeof bookData.description === "string") {
      description = bookData.description;
    } else if (typeof bookData.description.value === "string") {
      description = bookData.description.value;
    }
  }

  // get other info from google books
  // Google search is weird, sometimes it won't return the correct book first
  // Google Books omits `items` when totalItems is 0, so guard against undefined.
  let g_doc: GoogleBooksVolume | null = null;
  for (const item of g_data.items ?? []) {
    if (item.volumeInfo.title === title) {
      g_doc = item;
      break;
    }
  }
  if (!g_doc) {
    g_doc = g_data.items?.[0] ?? null;
  }
  if (!g_doc) {
    throw new Error(
      "No results found in Google Books for the given title and author.",
    );
  }

  const volumeInfo = g_doc?.volumeInfo;
  if (!volumeInfo) {
    throw new Error("No volume info found in Google Books API response.");
  }

  let foundIsbn: string | null = null;
  if (volumeInfo.IndustryIdentifiers) {
    const isbn13 = volumeInfo.IndustryIdentifiers.find(
      (id: IndustryIdentifier) => id.type === "ISBN_13",
    );
    const isbn10 = volumeInfo.IndustryIdentifiers.find(
      (id: IndustryIdentifier) => id.type === "ISBN_10",
    );
    foundIsbn = isbn13?.identifier ?? isbn10?.identifier ?? null;
  }

  if (!description) {
    if (volumeInfo.description) {
      description = volumeInfo.description;
    } else {
      description = "No description available.";
    }
  }

  if (description) {
    // Convert Windows-style newlines to UNIX-style
    description = description.replace(/\r\n/g, "\n");

    // Replace ***bold*** with <strong>
    description = description.replace(
      /\*\*\*(.*?)\*\*\*/g,
      "<strong>$1</strong>",
    );

    // Optionally: Remove markdown-style links like [text][1] → just keep "text"
    description = description.replace(/\[(.*?)\]\[\d+\]/g, "$1");

    // Remove markdown-style footnotes entirely
    description = description.replace(/\n\s*\[\d+\]:\s*https?:\/\/\S+/g, "");

    // Convert paragraph breaks into <p> blocks
    description = description
      .split(/\n{2,}/)
      .map((p: string) => `<p class="para-spacing">${p.trim()}</p>`)
      .join("\n");
  }

  const categories = volumeInfo.categories
    ? _parseCategories(volumeInfo.categories)
    : [];
  return {
    id: g_doc.id,
    title: volumeInfo.title || "No Title",
    authors: volumeInfo.authors
      ? volumeInfo.authors.join(", ")
      : "Unknown Author",
    coverUrl: getCoverUrl(g_doc.id),
    description: description,
    categories: categories ?? [],
    publishYear: volumeInfo.publishedDate || "Unknown Publish Year",
    isbn: foundIsbn ?? "",
  } as OpenLibraryRecommendationInfo;
}
