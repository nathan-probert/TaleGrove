"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getUserId, checkIfBookInCollection, changeBookCover } from '@/lib/supabase';

export default function BookCoversPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;
    const [book, setBook] = useState<any>(null);
    const [item, setItem] = useState<any>(null); // Track the entire item from Google Books API
    const [covers, setCovers] = useState<string[]>([]); // Track the covers
    const [isInCollection, setIsInCollection] = useState(false);


    const changeCover = (coverUrl: string) => {
        if (!isInCollection) {
            alert('Book is not in your collection!');
        } else {
            changeBookCover(book.id, book.user_id, coverUrl);
            alert(`Cover of ${book.title} changed!`);
        }
    };


    useEffect(() => {
        const fetchBook = async () => {
            const apiKey = process.env.NEXT_PUBLIC_GOOGLE_BOOKS_API_KEY;

            const res = await fetch(`https://www.googleapis.com/books/v1/volumes/${id}?key=${apiKey}`);
            const fetchedItem = await res.json();
            setItem(fetchedItem);

            const volumeInfo = fetchedItem.volumeInfo;

            const userId = await getUserId();

            let foundIsbn: string | null = null;
            if (volumeInfo.industryIdentifiers) {
                const isbn13 = volumeInfo.industryIdentifiers.find((id: any) => id.type === 'ISBN_13');
                const isbn10 = volumeInfo.industryIdentifiers.find((id: any) => id.type === 'ISBN_10');
                foundIsbn = isbn13?.identifier ?? isbn10?.identifier ?? null;
            }

            const coverUrls: string[] = [];

            // check google for covers
            if (volumeInfo.title) {
                try {
                    // const googleRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(volumeInfo.title)}inpublisher:${publisherName}&key=${apiKey}&maxResults=5`);
                    const googleRes = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(volumeInfo.title)}&key=${apiKey}&maxResults=5`);
                    if (googleRes.ok) {
                        const googleData = await googleRes.json();
                        if (googleData.items && googleData.items.length > 0) {
                            googleData.items.forEach((item: any) => {
                                coverUrls.push(`https://books.google.com/books/publisher/content/images/frontcover/${item.id}?fife=w400-h600&source=gbs_api`);
                            });
                        }
                    }
                } catch (error) {
                    console.error("Error fetching from Google Books:", error);
                }
            }

            // check open library for covers
            if (volumeInfo.title) {
                try {
                    const openLibraryRes = await fetch(`https://openlibrary.org/search.json?title=${encodeURIComponent(volumeInfo.title)}&limit=5`);
                    if (openLibraryRes.ok) {
                        const openLibraryData = await openLibraryRes.json();
                        if (openLibraryData.docs && openLibraryData.docs.length > 0) {
                            openLibraryData.docs.forEach((doc: any) => {
                                if (doc.cover_i) {
                                    coverUrls.push(`https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`);
                                }
                            });
                        }
                    }
                } catch (error) {
                    console.error("Error fetching from Open Library:", error);
                }
            }

            setCovers(coverUrls);

            setBook({
                id: fetchedItem.id,
                title: volumeInfo.title || 'No Title',
                author: volumeInfo.authors ? volumeInfo.authors.join(', ') : 'Unknown Author',
                rating: null,
                notes: null,
                user_id: userId ?? undefined,
                status: "reading",
                book_id: fetchedItem.id,
                isbn: foundIsbn,
                cover_url: coverUrls[0] || null,
            });

            if (userId) {
                const inCollection = await checkIfBookInCollection(fetchedItem.id, userId);
                setIsInCollection(inCollection);
            } else {
                setIsInCollection(false);
            }
        };

        if (id) fetchBook();
    }, [id]);

    const handleBack = () => {
        router.back();
    };

    if (!book || !item) return <p className="p-4">Loading...</p>; // Ensure both book and item are loaded

    return (
        <div>
            <button
                onClick={handleBack}
                className="mb-6 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
            >
                ← Back
            </button>


            {covers.length > 0 ? (
                <div className="grid grid-cols-5 gap-6 p-4">
                    {covers.map((coverUrl, index) => (
                        <div
                            key={index}
                            className="flex flex-col items-center rounded p-2 shadow hover:shadow-lg transition cursor-pointer"
                            onClick={() => changeCover(coverUrl)}
                        >
                            <img
                                src={coverUrl}
                                alt={`Cover ${index + 1} for ${book.title}`}
                                className="w-full h-auto object-contain mb-2"
                                style={{ maxHeight: '400px' }}
                                loading="lazy"
                                onError={(e) => {
                                    const parentDiv = (e.target as HTMLImageElement).closest('div');
                                    if (parentDiv) parentDiv.style.display = 'none';
                                }}
                            />
                            {/* Optional: Display the URL */}
                            {/* <p className="text-xs mt-1 break-all text-gray-500">{coverUrl}</p> */}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="px-4 text-gray-500">No alternative covers found.</p>
            )}
        </div>
    );
}
