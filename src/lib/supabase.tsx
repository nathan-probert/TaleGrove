import { createPagesBrowserClient } from "@supabase/auth-helpers-nextjs";
import {
  Book,
  Folder,
  BookStatus,
  UserBookData,
  BookRecommendation,
} from "@/types";
import { UserResponse } from "@supabase/supabase-js";

const supabase = createPagesBrowserClient({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLIC_KEY!,
});

export default supabase;

// Auth related functions
export async function signUpWithEmail(email: string, password: string) {
  return await supabase.auth.signUp({
    email,
    password,
  });
}

export async function signInWithEmail(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/books`,
    },
  });

  if (error) {
    throw error;
  }
  return data;
}

export async function signOut() {
  return supabase.auth.signOut();
}

export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function getSession() {
  return await supabase.auth.getSession();
}

export async function getUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id || null;
}

export async function resetPasswordForEmail(email: string): Promise<boolean> {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${typeof window !== "undefined" ? window.location.origin : ""}/reset-password`,
  });

  if (error) {
    console.error("Password reset error:", error);
    throw new Error(error.message);
  }
  return true;
}

export async function updatePassword(
  newPassword: string,
): Promise<UserResponse> {
  return await supabase.auth.updateUser({ password: newPassword });
}

// Book related functions
export async function addBook(bookData: Book): Promise<Book> {
  const insertData = { ...bookData } as Omit<Book, "id"> & { id?: string };
  delete insertData.id;
  // Postgres `date` columns reject "" — normalize empty date to null.
  if (insertData.date_read === "") {
    insertData.date_read = null;
  }

  const { data, error } = await supabase
    .from("books")
    .insert([insertData])
    .select("*")
    .single();

  if (error) {
    throw new Error(`Failed to add book "${bookData.title}": ${error.message}`);
  }

  return data as Book;
}

export async function deleteBook(bookId: string, userId: string) {
  const { error, count } = await supabase
    .from("books")
    .delete({ count: "exact" })
    .eq("id", bookId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error deleting book:", error);
    throw error;
  }

  return (count ?? 0) > 0;
}

export async function checkIfBookInCollection(
  bookId: string,
  userId: string,
): Promise<Book | null> {
  const { data, error } = await supabase
    .from("books")
    .select("*")
    .eq("user_id", userId)
    .eq("book_id", bookId)
    .maybeSingle(); // returns null if not found, without error

  if (error) {
    console.error("Error checking book collection:", error);
    throw error;
  }

  return data as Book | null;
}

export async function updateBookDetails(
  bookId: string,
  updates: {
    status: BookStatus;
    rating: number | null;
    notes: string | null;
    date_read?: string | null;
  },
  userId: string,
) {
  const { data, error } = await supabase
    .from("books")
    .update({
      status: updates.status,
      rating: updates.rating,
      notes: updates.notes,
      date_read:
        updates.status === BookStatus.completed
          ? updates.date_read || null
          : null,
    })
    .eq("id", bookId)
    .eq("user_id", userId);

  if (error) throw error;
  return data;
}

export async function changeBookCover(
  bookId: string,
  userId: string,
  coverUrl: string,
) {
  const { error } = await supabase
    .from("books")
    .update({ cover_url: coverUrl })
    .eq("book_id", bookId)
    .eq("user_id", userId);

  if (error) {
    console.error("Error changing book cover:", error);
    throw error;
  }
  return true;
}

// helper to create slug
function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-") // replace non-alphanumeric with hyphen
    .replace(/(^-|-$)+/g, ""); // trim hyphens
}

export async function createFolder(
  name: string,
  userId: string,
  parentId: string | null = null,
) {
  const { data, error } = await supabase
    .from("folders")
    .insert([
      { name, user_id: userId, parent_id: parentId, slug: slugify(name) },
    ])
    .single();

  if (error) throw error;
  return data;
}

export async function updateFolderName(
  folderId: string,
  name: string,
  userId: string,
) {
  const { data, error } = await supabase
    .from("folders")
    .update({ name, slug: slugify(name) })
    .eq("id", folderId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function addBookToFolder(
  bookId: string,
  oldFolderId: string,
  folderId: string | null,
  userId: string,
) {
  if (folderId && folderId !== "null") {
    // Upsert (not insert) so moving a book that's already in the target
    // folder is a harmless no-op instead of a unique-violation error.
    const { error } = await supabase.from("folder_books").upsert(
      [{ book_id: bookId, folder_id: folderId, user_id: userId }],
      { onConflict: "folder_id,book_id" },
    );

    if (error) throw error;
  }

  // remove from old folder if it exists
  if (oldFolderId) {
    await supabase
      .from("folder_books")
      .delete()
      .eq("book_id", bookId)
      .eq("folder_id", oldFolderId)
      .eq("user_id", userId);
  }
}

export async function addBookToFolders(
  bookId: string,
  folderIds: string[],
  userId: string,
) {
  const recordsToInsert = folderIds
    .filter((folderId) => folderId && folderId.trim() !== "")
    .map((folderId) => ({
      book_id: bookId,
      folder_id: folderId,
      user_id: userId,
    }));
  if (recordsToInsert.length === 0) return null;

  const { data, error } = await supabase
    .from("folder_books")
    .insert(recordsToInsert);

  if (error) {
    console.error("Error adding book to folders:", error);
    throw error;
  }

  return data;
}

export async function removeBookFromFolders(
  bookId: string,
  folderIds: string[],
  userId: string,
) {
  const { error } = await supabase
    .from("folder_books")
    .delete()
    .eq("book_id", bookId)
    .in("folder_id", folderIds)
    .eq("user_id", userId);

  if (error) {
    console.error("Error removing book from folders:", error);
    throw error;
  }
  return true;
}

export async function createRootFolder(userId: string) {
  const { data, error } = await supabase
    .from("folders")
    .insert([{ name: "Root", user_id: userId, parent_id: null, slug: "root" }])
    .single();

  if (error) throw error;
  return data;
}

export async function getParentId(folderId: string, userId: string) {
  const { data, error } = await supabase
    .from("folders")
    .select("parent_id")
    .eq("id", folderId)
    .eq("user_id", userId)
    .single();

  if (error) throw error;
  return data?.parent_id ?? null;
}

export async function getBooksInFolder(folderId: string, userId: string) {
  const { data, error } = await supabase
    .from("folder_books")
    .select("books(*)")
    .eq("folder_id", folderId)
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  if (error) throw error;

  return data?.map((entry) => entry.books as unknown as Book) ?? [];
}

export async function getUserFolders(userId: string) {
  const { data, error } = await supabase
    .from("folders")
    .select("*")
    .eq("user_id", userId)
    .order("sort_order", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return data;
}

export async function getRootId(userId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("folders")
    .select("id")
    .eq("user_id", userId)
    .eq("slug", "root")
    .single();

  if (error) throw error;
  return data?.id ?? null;
}

export async function getFoldersFromBook(bookId: string, userId: string) {
  const { data, error } = await supabase
    .from("folder_books")
    .select("folders(*)")
    .eq("book_id", bookId)
    .eq("user_id", userId);

  if (error) throw error;
  return data?.map((entry) => entry.folders as unknown as Folder) ?? [];
}

export async function getDirectSubfolders(
  folderId: string,
  userId: string,
): Promise<Folder[]> {
  const { data, error } = await supabase
    .from("folders")
    .select("*")
    .eq("parent_id", folderId)
    .eq("user_id", userId)
    .order("sort_order", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as Folder[];
}

export async function deleteFolder(folderId: string, userId: string) {
  // get books in the folder to be deleted
  const books = await getBooksInFolder(folderId, userId);
  if (books.length > 0) {
    throw new Error(
      "Cannot delete folder with books in it. Please remove the books first.",
    );
  }

  // Guard against silent cascade-orphaning: folders.parent_id is
  // ON DELETE CASCADE, so deleting a parent would auto-delete subfolders
  // (and cascade away their folder_books links, orphaning their books).
  // Callers must use moveFolderContentsToParent / deleteFolderRecursive.
  const subfolders = await getDirectSubfolders(folderId, userId);
  if (subfolders.length > 0) {
    throw new Error(
      "Cannot delete folder with subfolders in it. Please move or delete the contents first.",
    );
  }

  const { error } = await supabase
    .from("folders")
    .delete()
    .eq("id", folderId)
    .eq("user_id", userId);

  if (error) throw error;
  return true;
}

/**
 * Move a folder's direct contents (books + direct subfolders) up to its
 * parent, then delete the now-empty folder.
 *
 * Multi-folder book semantics: books are linked via folder_books with a
 * UNIQUE(folder_id, book_id) constraint. A book shelved in the deleted
 * folder AND elsewhere keeps its other links — we upsert into the parent
 * (no-op if already there) and only remove the deleted folder's link.
 */
export async function moveFolderContentsToParent(
  folderId: string,
  parentId: string | null,
  userId: string,
): Promise<boolean> {
  if (!parentId) {
    throw new Error("Cannot move contents: parent folder is missing.");
  }
  if (folderId === parentId) {
    throw new Error("Cannot move a folder's contents into itself.");
  }

  // Move direct books: bulk upsert into parent (respects the
  // UNIQUE(folder_id, book_id) constraint — already-shelved books are a
  // harmless no-op), then drop this folder's links.
  const { data: links, error: linksError } = await supabase
    .from("folder_books")
    .select("book_id")
    .eq("folder_id", folderId)
    .eq("user_id", userId);

  if (linksError) throw linksError;

  const bookIds = (links ?? []).map((r) => r.book_id as string);
  if (bookIds.length > 0) {
    const upserts = bookIds.map((book_id) => ({
      book_id,
      folder_id: parentId,
      user_id: userId,
    }));
    const { error: upsertError } = await supabase
      .from("folder_books")
      .upsert(upserts, { onConflict: "folder_id,book_id" });
    if (upsertError) throw upsertError;

    const { error: deleteLinksError } = await supabase
      .from("folder_books")
      .delete()
      .eq("folder_id", folderId)
      .eq("user_id", userId);
    if (deleteLinksError) throw deleteLinksError;
  }

  // Re-parent direct subfolders to the parent (bulk = per-folder
  // addFolderToFolder semantics in one query).
  const { error: reparentError } = await supabase
    .from("folders")
    .update({ parent_id: parentId })
    .eq("parent_id", folderId)
    .eq("user_id", userId);
  if (reparentError) throw reparentError;

  // Folder is now empty — safe to delete.
  const { error: deleteError } = await supabase
    .from("folders")
    .delete()
    .eq("id", folderId)
    .eq("user_id", userId);
  if (deleteError) throw deleteError;
  return true;
}

/**
 * Destructively delete a folder, its subfolders (deepest-first), its
 * folder_books links, and any books left with ZERO remaining folder links.
 * Books still shelved outside the deleted subtree are NEVER deleted — only
 * their in-subtree links go away (via book delete cascade / folder delete
 * cascade).
 *
 * Explicit deepest-first ordering in code so this stays correct even if the
 * folders.parent_id ON DELETE CASCADE FK is ever changed to RESTRICT.
 */
export async function deleteFolderRecursive(
  folderId: string,
  userId: string,
): Promise<boolean> {
  // Collect the full descendant subtree from the user's folder list.
  const { data: allFolders, error: foldersError } = await supabase
    .from("folders")
    .select("id, parent_id")
    .eq("user_id", userId);
  if (foldersError) throw foldersError;

  const rows = (allFolders ?? []) as { id: string; parent_id: string | null }[];
  const idSet = new Set(rows.map((r) => r.id));
  if (!idSet.has(folderId)) {
    throw new Error("Folder not found.");
  }

  const childrenByParent = new Map<string, string[]>();
  for (const r of rows) {
    if (r.parent_id === null) continue;
    const list = childrenByParent.get(r.parent_id) ?? [];
    list.push(r.id);
    childrenByParent.set(r.parent_id, list);
  }

  const subtreeIds: string[] = [];
  const depth = new Map<string, number>();
  const stack: string[] = [folderId];
  depth.set(folderId, 0);
  while (stack.length > 0) {
    const current = stack.pop() as string;
    subtreeIds.push(current);
    const currentDepth = depth.get(current) ?? 0;
    for (const child of childrenByParent.get(current) ?? []) {
      if (depth.has(child)) continue; // cycle guard
      depth.set(child, currentDepth + 1);
      stack.push(child);
    }
  }
  const subtreeSet = new Set(subtreeIds);

  // All book links touching the subtree.
  const { data: subtreeLinks, error: subtreeLinksError } = await supabase
    .from("folder_books")
    .select("book_id, folder_id")
    .eq("user_id", userId)
    .in("folder_id", subtreeIds);
  if (subtreeLinksError) throw subtreeLinksError;

  const touchedBookIds = Array.from(
    new Set(
      ((subtreeLinks ?? []) as { book_id: string; folder_id: string }[]).map(
        (r) => r.book_id,
      ),
    ),
  );

  // Of those books, which have links OUTSIDE the subtree? Single grouped
  // query instead of N per-book lookups.
  let orphanBookIds: string[] = [];
  if (touchedBookIds.length > 0) {
    const { data: allLinks, error: allLinksError } = await supabase
      .from("folder_books")
      .select("book_id, folder_id")
      .eq("user_id", userId)
      .in("book_id", touchedBookIds);
    if (allLinksError) throw allLinksError;

    const foldersByBook = new Map<string, string[]>();
    for (const r of (allLinks ?? []) as {
      book_id: string;
      folder_id: string;
    }[]) {
      const list = foldersByBook.get(r.book_id) ?? [];
      list.push(r.folder_id);
      foldersByBook.set(r.book_id, list);
    }
    orphanBookIds = touchedBookIds.filter((bookId) =>
      (foldersByBook.get(bookId) ?? []).every((fid) => subtreeSet.has(fid)),
    );
  }

  // Delete orphaned books first (their folder_books rows cascade away).
  // Non-orphans keep their outside links; their in-subtree links die with
  // the folders below.
  if (orphanBookIds.length > 0) {
    const { error: deleteBooksError } = await supabase
      .from("books")
      .delete()
      .eq("user_id", userId)
      .in("id", orphanBookIds);
    if (deleteBooksError) throw deleteBooksError;
  }

  // Deepest-first folder deletion — children before parents.
  const deepestFirst = [...subtreeIds].sort(
    (a, b) => (depth.get(b) ?? 0) - (depth.get(a) ?? 0),
  );
  for (const id of deepestFirst) {
    const { error: deleteFolderError } = await supabase
      .from("folders")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);
    if (deleteFolderError) throw deleteFolderError;
  }
  return true;
}

export async function addFolderToFolder(
  folderId: string,
  newParentId: string | null,
  userId: string,
) {
  const { data, error } = await supabase
    .from("folders")
    .update({ parent_id: newParentId })
    .eq("id", folderId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

// Functions for ai recommendations
export async function getUsersBooks(
  userId: string,
  yearsToCheck: number = Infinity,
) {
  // const columnsToReturn = `title, author, date_read, status, rating, notes`; // match UserBookData type
  const columnsToReturn = `title, author, status, rating, notes`; // match UserBookData type

  let query = supabase
    .from("books")
    .select(columnsToReturn)
    .eq("user_id", userId);
  if (yearsToCheck !== Infinity) {
    const dateThreshold = new Date(
      Date.now() - yearsToCheck * 365 * 24 * 60 * 60 * 1000,
    ).toISOString();
    query = query.gt("date_read", dateThreshold);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data as UserBookData[];
}

export async function saveRecommendation(
  userId: string,
  recommendation: BookRecommendation,
) {
  const insertData = {
    title: recommendation.title,
    author: recommendation.author,
    user_id: userId,
  };

  const { error } = await supabase
    .from("book_recommendations")
    .upsert(insertData)
    .select()
    .single();

  if (error) throw error;
  return true;
}

export async function getRecommendations(userId: string) {
  const { data, error } = await supabase
    .from("book_recommendations")
    .select("title, author")
    .eq("user_id", userId);

  if (error) throw error;
  return data as BookRecommendation[];
}

export async function reorderBookInFolder(
  draggedBookId: string,
  targetBookId: string,
  folderId: string | null,
  userId: string,
) {
  // Fetch all books in the folder
  const { data: folderBooks, error } = await supabase
    .from("folder_books")
    .select("id, book_id, sort_order, folder_id")
    .eq("folder_id", folderId)
    .eq("user_id", userId)
    .order("sort_order", { ascending: true });

  if (error || !folderBooks) return;

  const draggedIndex = folderBooks.findIndex(
    (b) => b.book_id === draggedBookId,
  );
  const targetIndex = folderBooks.findIndex((b) => b.book_id === targetBookId);

  if (draggedIndex === -1 || targetIndex === -1) return;

  // Move item in the array
  const [draggedBook] = folderBooks.splice(draggedIndex, 1);
  folderBooks.splice(targetIndex, 0, draggedBook);

  // Reassign order values
  const updates = folderBooks.map((b, index) => ({
    id: b.id,
    sort_order: index + 1,
    user_id: userId,
    folder_id: b.folder_id,
    book_id: b.book_id,
  }));

  const { error: updateError } = await supabase
    .from("folder_books")
    .upsert(updates, {
      onConflict: "id",
      ignoreDuplicates: false,
    });

  if (updateError) {
    console.error("Failed to update order:", updateError);
  }
  return updates;
}

export async function persistBookOrder(
  folderId: string,
  orderedBookIds: string[],
  userId: string,
) {
  if (orderedBookIds.length === 0) return [];

  // Resolve folder_books row ids for each book_id in this folder
  const { data: rows, error } = await supabase
    .from("folder_books")
    .select("id, book_id, folder_id")
    .eq("folder_id", folderId)
    .eq("user_id", userId);

  if (error) throw error;
  if (!rows) return [];

  const rowByBookId = new Map(rows.map((r) => [r.book_id as string, r]));

  const updates = orderedBookIds
    .map((bookId, index) => {
      const row = rowByBookId.get(bookId);
      if (!row) return null;
      return {
        id: row.id as string,
        folder_id: row.folder_id as string,
        book_id: bookId,
        user_id: userId,
        sort_order: index + 1,
      };
    })
    .filter((u): u is NonNullable<typeof u> => u !== null);

  if (updates.length === 0) {
    // Fail loudly instead of silently keeping a stale order.
    throw new Error(
      `persistBookOrder: none of the ${orderedBookIds.length} ordered books matched folder_books rows in folder ${folderId}`,
    );
  }

  const { error: updateError } = await supabase
    .from("folder_books")
    .upsert(updates, { onConflict: "id", ignoreDuplicates: false });

  if (updateError) throw updateError;
  return updates;
}

export async function persistFolderOrder(
  parentId: string | null,
  orderedFolderIds: string[],
  userId: string,
) {
  if (orderedFolderIds.length === 0) return [];

  const updates = orderedFolderIds.map((id, index) => ({
    id,
    user_id: userId,
    parent_id: parentId,
    sort_order: index + 1,
  }));

  const { error } = await supabase
    .from("folders")
    .upsert(updates, { onConflict: "id", ignoreDuplicates: false });

  if (error) throw error;
  return updates;
}
