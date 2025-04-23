'use client';

import { useState } from 'react';
import { Book, BookFromAPI, BookRecommendation, OpenLibraryRecommendationInfo, UserBookData } from '@/types'; // define this type or inline it
import { Dialog } from '@headlessui/react';
import { Loader2 } from 'lucide-react';
import { getBookFromAPI, getCoverUrl, getOpenLibraryRecommendation, searchForBooks } from '@/lib/books_api';
import { getUserId, getUsersBooks } from '@/lib/supabase';
import { generateRecommendations } from '@/lib/gemini';

const mockBooks: BookRecommendation[] = [
  {
    title: 'Fourth Wing',
    author: 'Rebecca Yarros',
  },
  {
    title: 'The Invisible Life of Addie LaRue',
    author: 'V.E. Schwab',
  },
];

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<OpenLibraryRecommendationInfo[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showModal, setShowModal] = useState(false);

  const getRecommendations = async (): Promise<BookRecommendation[]> => {
    const userId = await getUserId();
    if (!userId) {
      console.error('User ID not found. Please log in.');
      return [];
    }

    const userData: UserBookData[] = await getUsersBooks(userId);
    return await generateRecommendations(userData) ?? [];
  };

  const getBookFromRecommendation = async (book: BookRecommendation): Promise<OpenLibraryRecommendationInfo> => {
    // Works, but google descriptions are trash
    // const books = await searchForBooks(book.title, book.author, 1);
    // const MAX_DESCRIPTION_LENGTH = 250;
    // if (books[0].description && books[0].description.length > MAX_DESCRIPTION_LENGTH) {
    //     books[0].description = books[0].description.substring(0, MAX_DESCRIPTION_LENGTH) + "...";
    // }
    // return books[0];

    const bookData = await getOpenLibraryRecommendation(book.title, book.author, 1);
    return bookData;
  };

  const handleGenerate = async () => {
    setIsLoading(true);
    const recommendations: BookRecommendation[] = await getRecommendations();
    console.log(recommendations);

    const allBookData: OpenLibraryRecommendationInfo[] = [];
    for (const book of recommendations) {
      allBookData.push(await getBookFromRecommendation(book));
    }
    setRecommendations(allBookData);

    setIsLoading(false);
    setCurrentIndex(0);
    setShowModal(true);
  };

  const handleNext = () => {
    if (currentIndex < recommendations.length - 1) {
      setCurrentIndex((i) => i + 1);
    } else {
      setShowModal(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-br from-yellow-50 to-green-50">
      <button
        onClick={handleGenerate}
        disabled={isLoading}
        className="bg-emerald-600 text-white px-8 py-4 text-xl rounded-2xl shadow hover:bg-emerald-700 transition"
      >
        {isLoading ? (
          <Loader2 className="animate-spin w-6 h-6" />
        ) : (
          'Generate'
        )}
      </button>

      <Dialog open={showModal} onClose={() => setShowModal(false)} className="relative z-50">
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <Dialog.Title className="text-xl font-bold">
              {/* Ensure title is a string */}
              {typeof recommendations[currentIndex]?.title === 'string' ? recommendations[currentIndex]?.title : 'Unknown Title'}
            </Dialog.Title>
            <p className="text-gray-700">
              {/* Ensure authors is a string */}
              by {typeof recommendations[currentIndex]?.authors === 'string' ? recommendations[currentIndex]?.authors : 'Unknown Author'}
            </p>

            {/* Placeholder for more book data */}
            <div className="w-80 aspect-[2/3] bg-gray-100 rounded-lg flex items-center justify-center text-gray-400 mx-auto">
              <img
                src={recommendations[currentIndex]?.coverUrl || '/placeholder.jpg'} // Use placeholder image if no cover URL
                alt="Book Cover"
                className="w-full h-full object-cover rounded-lg"
              />
            </div>
            <p className="text-sm text-gray-500 line-clamp-5">
              {/* Ensure description is a string and provide fallback */}
              {typeof recommendations[currentIndex]?.description === 'string' ? recommendations[currentIndex]?.description : 'No description available.'}
            </p>
            <button
              onClick={handleNext}
              className="bg-emerald-500 text-white w-full py-2 rounded-lg hover:bg-emerald-600 transition"
            >
              {currentIndex < recommendations.length - 1 ? 'Next' : 'Done'}
            </button>
          </Dialog.Panel>
        </div>
      </Dialog>
    </div>
  );
}
