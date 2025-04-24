
// Books in the database
export interface Book {
  id: string;
  user_id: string;
  title: string;
  author: string;
  status: BookStatus;
  rating?: number | null;
  notes?: string | null;
  isbn: string;
  book_id: string;
  cover_url: string;
  dateRead?: string | null;
  sort_order?: number | null;
}
export enum BookStatus {
  reading = 'reading',
  completed = 'completed',
  wishlist = 'wishlist',
}

// Folders in the database
export interface Folder {
  id: string;
  name: string;
  user_id: string;
  parent_id: string | null;
  slug: string;
  sort_order?: number | null;
}

export type BookOrFolder =
  | (Book & { isFolder: false })
  | (Folder & { isFolder: true });

export type BookFromAPI = {
  id: string;
  title: string;
  authors: string;
  description: string;
  isbn: string;
};

export type UserBookData = {
  title: string;
  author: string;
  status: BookStatus;
  rating?: number | null;
  notes?: string | null; // took out date_read for now
}

export type BookRecommendation = {
  title: string;
  author: string;
}

export type OpenLibraryRecommendationInfo = {
  id: string;
  title: string;
  authors: string;
  coverUrl: string;
  description: string;
  categories: string[];
  publishYear: string;
  isbn: string;
}