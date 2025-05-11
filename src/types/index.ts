export enum BookStatus {
  reading = 'reading',
  completed = 'completed',
  wishlist = 'wishlist',
}

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
  categories: string[];
  date_read?: string | null;
  sort_order?: number | null;
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
  categories: string[];
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

export type IndustryIdentifier = {
  type: string;
  identifier: string;
}

export type GoogleBooksVolume = {
  id: string;
  volumeInfo: {
    title: string;
    authors?: string[];
    publisher?: string;
    description?: string;
    IndustryIdentifiers?: IndustryIdentifier[];
    pageCount?: number;
    printedPageCount?: number;
    printType?: string;
    categories?: string[];
    averageRating?: number;
    ratingsCount?: number;
    contentVersion?: string;
    language?: string;
    publishedDate?: string;
  };
};

export type Author = {
  author: {
    key: string;
  };
}
export type OpenLibraryDoc = {
  id: string;
  key: string;
  title: string;
  authors: Author[];
  cover_edition_key: string;
  cover_i: number;
  first_publish_year: number;
  isbn?: string[];
  subject?: string[];
  publish_year?: number[];
  publish_place?: string[];
  edition_key?: string[];
  author_key?: string[];
  lccn?: string[];
  oclc?: string[];
  description?: string;
}

export type Group = {
  id?: string | null;
  name: string;
};

export type GroupMember = {
  id?: string | null;
  group_id: string;
  group_name: string;
  user_id: string;
  role: GroupRole;
};

export type GroupMemberWithProfile = GroupMember & {
  display_name: string;
};

export enum GroupRole {
  Admin = 'admin',
  Member = 'member',
  Invited = 'invited',
}

export enum RecommendationStatus {
  Pending = 'pending',
  Rejected = 'rejected',
  Accepted = 'accepted',
}