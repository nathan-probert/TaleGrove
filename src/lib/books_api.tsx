// MAKING MIDDLEWARE AS OPENLIBRARY AND GOOGLE BOOKS ARE SIMILAR, NOT SURE WHICH WAY TO GO

// UPDATE: USING GOOGLE BOOKS API FOR NOW, OPENLIBRARY IS MORE CUBERSOME AS I HAVE TO MAKE MULTIPLE CALLS TO GET THE DATA I NEED

import { BookFromAPI, OpenLibraryRecommendationInfo } from "@/types";
import { desc } from "framer-motion/client";


const useGoogle = true;
const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;


function googleToGeneral(fetchedItem: any): BookFromAPI {
    const volumeInfo = fetchedItem["volumeInfo"] || {};

    let foundIsbn: string | null = null;
    if (volumeInfo.industryIdentifiers) {
      const isbn13 = volumeInfo.industryIdentifiers.find((id: any) => id.type === 'ISBN_13');
      const isbn10 = volumeInfo.industryIdentifiers.find((id: any) => id.type === 'ISBN_10');
      foundIsbn = isbn13?.identifier ?? isbn10?.identifier ?? null;
    }

    return {
        id: fetchedItem.id,
        title: volumeInfo.title || "No Title",
        authors: volumeInfo.authors ? volumeInfo.authors.join(', ') : 'Unknown Author',
        description: volumeInfo["description"] || "No Description",
        isbn: foundIsbn ?? "",
    } as BookFromAPI;
}

async function openLibraryToGeneral(fetchedItem: any): Promise<BookFromAPI> {
    const title = fetchedItem.title ?? "Unknown Title";
    const description = fetchedItem.description ?? "No description available.";
  
    // Get author names
    const authorKeys = (fetchedItem.authors ?? []).map((a: any) => a.author.key);
    const authors = await Promise.all(
      authorKeys.map(async (key: string) => {
        const res = await fetch(`https://openlibrary.org${key}.json`);
        const data = await res.json();
        return data.name;
      })
    );
  
    // Get ISBNs from first edition
    const editionRes = await fetch(`https://openlibrary.org/works/${fetchedItem.id}/editions.json?limit=1`);
    const editionData = await editionRes.json();
    const firstEdition = editionData.entries?.[0];
    const isbn =
      firstEdition?.isbn_13?.[0] ??
      firstEdition?.isbn_10?.[0] ??
      "No ISBN available";
  
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
        const res = await fetch(`https://www.googleapis.com/books/v1/volumes/${id}?key=${googleApiKey}`);
        const fetchedItem = await res.json();
        return googleToGeneral(fetchedItem);
    } else {
        const workRes = await fetch(`https://openlibrary.org/works/${id}.json`);
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

export async function searchForBooks(title: string, author: string, maxResults: number = 15): Promise<BookFromAPI[]> {
    if (useGoogle) {
        const queryParts = [];
        if (title) queryParts.push(`intitle:${encodeURIComponent(title)}`);
        if (author) queryParts.push(`inauthor:${encodeURIComponent(author)}`);

        const query = `q=${queryParts.join('+')}`;

        // Include fields parameter to request only necessary data
        const fields = 'items(id,volumeInfo(title,authors, description))';
        const url = `https://www.googleapis.com/books/v1/volumes?${query}&maxResults=${maxResults}&langRestrict=en&fields=${encodeURIComponent(fields)}&key=${googleApiKey}`;

        const res = await fetch(url);
        const fetchedItems = await res.json();

        let processedResults: BookFromAPI[] = [];
        if (!fetchedItems.items) {
            console.error("No items found in the response.");
            console.log(url);
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

        const query = queryParts.join('&');
    
        const url = `https://openlibrary.org/search.json?${query}&limit=${maxResults}`;
        const res = await fetch(url);

        const data = await res.json();
    
        const books = await Promise.all(
            data.docs.slice(0, maxResults).map(async (doc: any) => {
                const bookId = doc.key?.replace("/works/", "");
                const title = doc.title ?? "Unknown Title";
                const authors = doc.author_name?.join(", ") ?? "Unknown Author";
        
                return await _getOpenLibraryBookData(bookId, title, authors);
            })
        );

        return books;        
    }
}

async function _getOpenLibraryBookData(bookId: any, title: any, authors: any): Promise<BookFromAPI> {
    const editionRes = await fetch(`https://openlibrary.org/works/${bookId}.json`);
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

export async function getOpenLibraryRecommendation(title: string, author: string, maxResults=1): Promise<OpenLibraryRecommendationInfo> {
    const queryParts = [];
    if (title) queryParts.push(`title=${encodeURIComponent(title)}`);
    if (author) queryParts.push(`author=${encodeURIComponent(author)}`);

    const query = queryParts.join('&');

    const url = `https://openlibrary.org/search.json?${query}&limit=${maxResults}`;
    console.log(url);
    const res = await fetch(url);

    const data = await res.json();

    const books = await Promise.all(
        data.docs.slice(0, maxResults).map(async (doc: any) => {
            const bookId = doc.key?.replace("/works/", "");
            const title = doc.title ?? "Unknown Title";
            const authors = doc.author_name?.join(", ") ?? "Unknown Author";
            const publishYear = doc.first_publish_year ?? "Unknown Year";
            const coverUrl = doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg` : null;

            const book_url = `https://openlibrary.org/works/${bookId}.json`;
            const bookRes = await fetch(book_url);
            const bookData = await bookRes.json();

            const description = bookData.description ?? "No description available.";
            const categories = bookData.subjects ?? [];
            const limitedCategories = categories
                .filter((category: string) => typeof category === 'string' 
                    && category.toLowerCase() !== 'fiction' 
                    && isEnglish(category)
                )
                .slice(0, 3);
                
            return {
                title: title,
                authors: authors,
                coverUrl: coverUrl,
                description: description,
                categories: limitedCategories,
                publishYear: publishYear
            } as OpenLibraryRecommendationInfo;
        }
    ));
    return books[0];
}
    
const isEnglish = (category: string): boolean => {
    // Check if the string contains only English letters and spaces
    const isValidEnglishChars = /^[A-Za-z\s]+$/.test(category);
    // Ensure the first letter is capitalized and it's a valid English string
    return isValidEnglishChars && category[0] === category[0].toUpperCase();
};