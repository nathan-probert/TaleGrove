'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookRecommendation,
  RecommendationStatus,
} from '../../types';
import {
  getUserId,
  getUsersBooks,
  getRecommendations,
  saveRecommendation,
} from '../../lib/supabase';
import { generateRecommendations } from '../../lib/gemini';

export default function HomePage() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAndSetUserId = async () => {
      const id = await getUserId();
      setUserId(id);
    };
    fetchAndSetUserId();
  }, []);

  const fetchBasicRecommendations = async (): Promise<BookRecommendation[]> => {
    if (!userId) throw new Error("User not authenticated");

    const userBooks = await getUsersBooks(userId);
    const oldRecs = await getRecommendations(userId);

    return await generateRecommendations(userBooks, oldRecs);
  };

  const handleGenerateRecommendationsClick = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const basicRecs = await fetchBasicRecommendations();
      if (basicRecs && basicRecs.length > 0) {
        if (userId) {
          for (const rec of basicRecs) {
            try {
              await saveRecommendation(userId, rec, RecommendationStatus.Pending);
            } catch (saveError) {
              console.warn(`Failed to save pending status for ${rec.title}:`, saveError);
            }
          }
        }
        router.push('/discover/recommendations');
      } else {
        setError("No new recommendations found at this time. Try adjusting your library or check back later!");
      }
    } catch (err) {
      console.error("Failed to generate recommendations:", err);
      setError("Sorry, we couldn't generate recommendations. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewAllRecommendations = () => {
    router.push('/discover/recommendations');
  };

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 flex flex-col items-center min-h-screen bg-background text-foreground">
      <h1 className="text-4xl font-bold mb-8 text-primary">Discover New Books</h1>

      {userId && (
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4 mb-8">
          <button
            onClick={handleGenerateRecommendationsClick}
            disabled={isLoading}
            className="px-8 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-opacity-50 transition duration-150 ease-in-out text-lg font-semibold shadow-md disabled:opacity-50"
          >
            {isLoading ? 'Generating...' : 'Generate My Recommendations'}
          </button>
          <button
            onClick={handleViewAllRecommendations}
            className="px-8 py-3 bg-secondary text-white rounded-lg hover:bg-secondary-dark focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-opacity-50 transition duration-150 ease-in-out text-lg font-semibold shadow-md"
          >
            View My Saved Recommendations
          </button>
        </div>
      )}

      {isLoading && (
        <p className="text-lg animate-pulse">Loading your recommendations...</p>
      )}

      {error && (
        <div className="mt-8 p-4 bg-red-100 text-red-700 rounded-md shadow w-full max-w-md text-center">
          <p className="font-semibold">Error:</p>
          <p>{error}</p>
        </div>
      )}

      {!userId && (
        <p className="text-lg text-muted-foreground">
          {isLoading ? 'Loading user information...' : 'Please sign in to discover recommendations.'}
        </p>
      )}
    </div>
  );
}
