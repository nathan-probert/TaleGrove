import { BookRecommendation } from "@/types";

export async function generateRecommendations(
  userData: BookRecommendation[],
  oldRecommendations: BookRecommendation[],
): Promise<BookRecommendation[]> {
  const res = await fetch("/api/recommendations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userData, oldRecommendations }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to generate recommendations.");
  }

  return res.json();
}
