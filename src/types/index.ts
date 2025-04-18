export interface Book {
  id?: string;
  user_id?: string;
  title: string;
  author: string;
  rating?: number | null;
  notes?: string | null;
  isbn?: string | null;
  book_id?: string | null;
  cover_url?: string | null;
  completed: boolean;
  created_at?: string;
}

export interface Folder {
  id: string;
  name: string;
  user_id: string;
  parent_id: string | null;
  slug: string;
  created_at: string;
}

export type BookOrFolder =
  | (Book & { isFolder: false })
  | (Folder & { isFolder: true });

export interface GoogleBooksVolume {
  volumeInfo: {
    description?: string;
  };
}