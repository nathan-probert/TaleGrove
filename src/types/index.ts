
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

export type GoogleBooksVolume = {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    publisher?: string;
    description?: string;
    industryIdentifiers?: {
      type: string;
      identifier: string;
    }[];
    pageCount?: number;
    printedPageCount?: number;
    printType?: string;
    categories?: string[];
    averageRating?: number;
    ratingsCount?: number;
    contentVersion?: string;
    language?: string;
  };
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