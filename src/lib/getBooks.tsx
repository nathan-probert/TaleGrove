import supabase, { getBooksInFolder } from "@/lib/supabase";
import { Book, Folder } from "@/types";

export async function fetchUserBooksAndFolders(
  userId: string,
  parentFolderId: string,
) {
  // Fetch folders with the specified parent_id, ordered by sort_order
  const foldersRes = await supabase
    .from("folders")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true, nullsFirst: false });
  if (foldersRes.error) throw foldersRes.error;

  const folders = (foldersRes.data || [])
    .filter((folder) => folder.parent_id === parentFolderId)
    .sort((a, b) => (a.sort_order ?? Number.MAX_SAFE_INTEGER) - (b.sort_order ?? Number.MAX_SAFE_INTEGER))
    .map((folder) => ({ ...folder, isFolder: true }));

  // Now get the books in the folder
  const books: Book[] = await getBooksInFolder(parentFolderId, userId);
  const booksAsItems = books.map((book) => ({ ...book, isFolder: false }));

  return [...folders, ...booksAsItems];
}

export const deleteUserBook = async (id: string, userId: string) => {
  const { error } = await supabase
    .from("books")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
};

// --- Whole-library search -------------------------------------------------

export interface GlobalBookResult extends Book {
  isFolder: false;
  /** e.g. "Fantasy / Epic", or "Home" for root-level/orphan books. */
  locationPath: string;
  locationFolderIds: string[];
}

export interface GlobalFolderResult extends Folder {
  isFolder: true;
  /** Parent path, e.g. "Fantasy" or "Home" for top-level folders. */
  locationPath: string;
  /** Full slug path from root (excluding root), e.g. "fantasy/epic". */
  slugPath: string;
}

export interface GlobalSearchResults {
  books: GlobalBookResult[];
  folders: GlobalFolderResult[];
}

const GLOBAL_SEARCH_LIMIT = 50;

/**
 * Escape user input for a PostgREST `or=(title.ilike.%..%,author.ilike.%..%)`
 * filter. Commas/parens are structural in `or=(...)` so they are stripped;
 * LIKE wildcards are backslash-escaped so typing %/_ matches literally.
 */
function sanitizeForOrFilter(raw: string): string {
  const withoutStructure = raw.replace(/[,()]/g, " ").trim();
  if (!withoutStructure) return "";
  return withoutStructure
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_");
}

function getFullNamePath(
  folderId: string,
  byId: Map<string, Folder>,
): string[] {
  const names: string[] = [];
  const visited = new Set<string>();
  let curId: string | null = folderId;
  let depth = 0;
  while (curId && !visited.has(curId) && depth < 50) {
    visited.add(curId);
    const cur = byId.get(curId);
    if (!cur) break;
    if (cur.parent_id !== null) {
      if (cur.name) names.unshift(cur.name);
      curId = cur.parent_id;
    } else {
      // True root (parent_id null) — excluded from display paths.
      break;
    }
    depth++;
  }
  return names;
}

function getFullSlugPath(
  folderId: string,
  byId: Map<string, Folder>,
): string[] {
  const slugs: string[] = [];
  const visited = new Set<string>();
  let curId: string | null = folderId;
  let depth = 0;
  while (curId && !visited.has(curId) && depth < 50) {
    visited.add(curId);
    const cur = byId.get(curId);
    if (!cur) break;
    if (cur.parent_id !== null) {
      if (cur.slug) slugs.unshift(cur.slug);
      curId = cur.parent_id;
    } else {
      break;
    }
    depth++;
  }
  return slugs;
}

/**
 * Server-side whole-library search. Books are filtered in Postgres via
 * `user_id` + case-insensitive title/author match (`or` + `ilike`), limited
 * to ~50. Folders are matched from the caller-provided `allFolders` cache
 * (fetched once per search open, not per keystroke) so no extra folder query
 * runs per keystroke. Every returned book carries `isFolder: false`.
 */
export async function searchLibrary(
  userId: string,
  rawQuery: string,
  allFolders: Folder[],
  limit: number = GLOBAL_SEARCH_LIMIT,
): Promise<GlobalSearchResults> {
  const trimmed = rawQuery.trim();
  if (!trimmed || !userId) return { books: [], folders: [] };
  const sanitized = sanitizeForOrFilter(trimmed);
  if (!sanitized.trim()) return { books: [], folders: [] };

  const byId = new Map<string, Folder>(allFolders.map((f) => [f.id, f]));

  // Books: server-side ilike on title/author.
  const booksRes = await supabase
    .from("books")
    .select("*")
    .eq("user_id", userId)
    .or(`title.ilike.%${sanitized}%,author.ilike.%${sanitized}%`)
    .limit(limit);
  if (booksRes.error) throw booksRes.error;
  const rawBooks = (booksRes.data ?? []) as Book[];

  // Resolve containing folder(s) for location chips.
  const bookIds = rawBooks.map((b) => b.id);
  const bookToFolderIds = new Map<string, string[]>();
  if (bookIds.length > 0) {
    const joinsRes = await supabase
      .from("folder_books")
      .select("book_id, folder_id")
      .eq("user_id", userId)
      .in("book_id", bookIds);
    if (joinsRes.error) throw joinsRes.error;
    const joins = (joinsRes.data ?? []) as {
      book_id: string;
      folder_id: string;
    }[];
    for (const j of joins) {
      const arr = bookToFolderIds.get(j.book_id) ?? [];
      arr.push(j.folder_id);
      bookToFolderIds.set(j.book_id, arr);
    }
  }

  const books: GlobalBookResult[] = rawBooks.map((book) => {
    const folderIds = bookToFolderIds.get(book.id) ?? [];
    const candidatePaths = folderIds
      .map((fid) => getFullNamePath(fid, byId).join(" / "))
      .filter((p) => p !== "")
      .sort((a, b) => a.localeCompare(b));
    return {
      ...book,
      isFolder: false as const,
      locationPath: candidatePaths[0] ?? "Home",
      locationFolderIds: folderIds,
    };
  });
  books.sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));

  // Folders: global name match from the cached folder list (excludes root).
  const lowered = trimmed.toLowerCase();
  const folders: GlobalFolderResult[] = allFolders
    .filter((f) => f.parent_id !== null)
    .filter((f) => (f.name ?? "").toLowerCase().includes(lowered))
    .sort(
      (a, b) =>
        (a.sort_order ?? Number.MAX_SAFE_INTEGER) -
          (b.sort_order ?? Number.MAX_SAFE_INTEGER) ||
        (a.name ?? "").localeCompare(b.name ?? ""),
    )
    .slice(0, limit)
    .map((f) => {
      const parentPath = f.parent_id
        ? getFullNamePath(f.parent_id, byId).join(" / ")
        : "";
      return {
        ...f,
        isFolder: true as const,
        locationPath: parentPath || "Home",
        slugPath: getFullSlugPath(f.id, byId).join("/"),
      };
    });

  return { books, folders };
}
