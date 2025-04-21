
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
  notes?: string | null;
  dateRead?: string | null;
}

export type BookRecommendation = {
  title: string;
  author: string;
}
