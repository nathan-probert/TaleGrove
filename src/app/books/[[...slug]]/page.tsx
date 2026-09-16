"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import BookList from "@/components/dashboard/BookList";
import BookToolbar from "@/components/dashboard/BookToolbar";
import BookCard from "@/components/dashboard/BookCard";
import FolderCard from "@/components/dashboard/FolderCard";
import { BookOrFolder, Folder } from "@/types";
import {
  fetchUserBooksAndFolders,
  searchLibrary,
  type GlobalSearchResults,
} from "@/lib/getBooks";
import supabase, {
  createFolder,
  getRootId,
  getCurrentUser,
  getUserFolders,
  updateFolderName,
  getBooksInFolder,
  getDirectSubfolders,
  moveFolderContentsToParent,
  deleteFolderRecursive,
} from "@/lib/supabase";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { Loader2, Search, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { FolderNameModal } from "@/components/Modals/FolderNameModal";
import {
  DeleteFolderModal,
  type DeleteFolderMode,
} from "@/components/Modals/DeleteFolderModal";

export default function Books() {
  const params = useParams();
  const slugArray = useMemo(
    () =>
      params?.slug
        ? Array.isArray(params.slug)
          ? params.slug
          : [params.slug]
        : [],
    [params?.slug],
  );

  const [books, setBooks] = useState<BookOrFolder[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasLoaded, setHasLoaded] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false); // State for delete operation
  const [hiddenItemIds, setHiddenItemIds] = useState<string[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<
    { id: string | null; name: string; slug: string | null }[]
  >([{ id: null, name: "Home", slug: null }]);
  const [isRoot, setIsRoot] = useState<boolean>(false);
  const [parentFolderId, setParentFolderId] = useState<string | null>(null);
  const [isFolderModalOpen, setIsFolderModalOpen] = useState<boolean>(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [deleteCounts, setDeleteCounts] = useState<{
    books: number;
    subfolders: number;
  } | null>(null);
  const [deleteCountsLoading, setDeleteCountsLoading] =
    useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [folderModalMode, setFolderModalMode] = useState<"create" | "rename">(
    "create",
  );
  const [currentFolderName, setCurrentFolderName] = useState<string>("");
  // Bumped whenever a book/folder move may have changed a subfolder's
  // contents, so FolderCards refetch their collage/count without a reload.
  const [folderPreviewVersion, setFolderPreviewVersion] = useState<number>(0);

  const router = useRouter();
  const pathname = usePathname();

  // In-collection search state, initialized from the URL so ?q= links are
  // shareable. Client-side only.
  const readSearchParams = (): URLSearchParams =>
    typeof window === "undefined"
      ? new URLSearchParams()
      : new URLSearchParams(window.location.search);
  const [query, setQuery] = useState<string>(
    () => readSearchParams().get("q") ?? "",
  );

  // Collapsible search row state. Deep-links with ?q= start open.
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(
    () => (readSearchParams().get("q") ?? "").trim() !== "",
  );
  const searchToggleRef = useRef<HTMLButtonElement>(null);

  // Whole-library search state. `allFolders` is the folder cache: fetched once
  // per search open (not per keystroke). `debouncedQuery` trails `query` by
  // ~300ms; the server-side fetch runs against the debounced value.
  const [debouncedQuery, setDebouncedQuery] = useState<string>(() =>
    readSearchParams().get("q")?.trim() ?? "",
  );
  const [allFolders, setAllFolders] = useState<Folder[] | null>(null);
  const [globalResults, setGlobalResults] =
    useState<GlobalSearchResults | null>(null);
  const [globalLoading, setGlobalLoading] = useState<boolean>(false);
  const searchSeqRef = useRef(0);

  // Serialize the current view params for URL persistence + folder links.
  const buildViewQueryString = useCallback((): string => {
    const params = new URLSearchParams();
    const trimmedQuery = query.trim();
    if (trimmedQuery) params.set("q", trimmedQuery);
    return params.toString();
  }, [query]);

  const withCurrentQuery = useCallback(
    (basePath: string): string => {
      const queryString = buildViewQueryString();
      return queryString ? `${basePath}?${queryString}` : basePath;
    },
    [buildViewQueryString],
  );

  // Persist q to ? query params without a full reload.
  const isFirstSyncRef = useRef(true);
  useEffect(() => {
    if (isFirstSyncRef.current) {
      isFirstSyncRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      const queryString = buildViewQueryString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    }, 250);
    return () => clearTimeout(timer);
  }, [buildViewQueryString, pathname, router]);

  // Folder cache: single fetch per search open, never per keystroke.
  useEffect(() => {
    if (!isSearchOpen || !userId || allFolders !== null) return;
    let cancelled = false;
    (async () => {
      try {
        const folders = await getUserFolders(userId);
        if (!cancelled) setAllFolders((folders as Folder[]) ?? []);
      } catch (error) {
        console.error("Error loading folders for search:", error);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isSearchOpen, userId, allFolders]);

  // Debounce the raw input ~300ms so the server-side fetch runs settled.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed === "") {
      setDebouncedQuery("");
      return;
    }
    const timer = setTimeout(() => setDebouncedQuery(trimmed), 300);
    return () => clearTimeout(timer);
  }, [query]);

  // Whole-library fetch against the debounced query + cached folders.
  useEffect(() => {
    if (!isSearchOpen || debouncedQuery.trim() === "" || !userId || !allFolders) {
      if (debouncedQuery.trim() === "") {
        setGlobalResults(null);
        setGlobalLoading(false);
      }
      return;
    }
    const seq = ++searchSeqRef.current;
    setGlobalLoading(true);
    (async () => {
      try {
        const results = await searchLibrary(
          userId,
          debouncedQuery,
          allFolders,
          50,
        );
        if (seq !== searchSeqRef.current) return;
        setGlobalResults(results);
      } catch (error) {
        console.error("Global search failed:", error);
        if (seq === searchSeqRef.current)
          setGlobalResults({ books: [], folders: [] });
      } finally {
        if (seq === searchSeqRef.current) setGlobalLoading(false);
      }
    })();
  }, [debouncedQuery, isSearchOpen, userId, allFolders]);

  const resolveFolderPath = useCallback(
    async (userId: string, slugPath: string[]) => {
      let parentId: string | null = null;
      // The true parent of the final folder (null at root). Tracked through
      // the loop so move-up targets never go stale on deeper navigation.
      let directParentId: string | null = null;
      const crumbs: { id: string | null; name: string; slug: string | null }[] =
        [{ id: null, name: "Home", slug: null }];

      for (const slug of slugPath) {
        let query = supabase
          .from("folders")
          .select("id, name, slug")
          .eq("slug", slug)
          .eq("user_id", userId);

        // Handle root folder case
        if (parentId === null) {
          parentId = await getRootId(userId);
        }

        directParentId = parentId;
        query = query.eq("parent_id", parentId);
        const result = await query.single();
        const data = result.data as Pick<Folder, "id" | "name" | "slug"> | null;

        if (!data) {
          console.warn(
            `Folder not found for slug: ${slug}, parentId: ${parentId}`,
          );
          return { folderId: null, breadcrumbs: crumbs, directParentId: null };
        }

        crumbs.push({ id: data.id, name: data.name, slug: data.slug });
        parentId = data.id;
      }

      return { folderId: parentId, breadcrumbs: crumbs, directParentId };
    },
    [],
  );

  // Monotonic sequence so a superseded (older) fetch can never overwrite
  // newer state — e.g. two rapid drag-and-drop refreshes racing each other.
  const fetchSeqRef = useRef(0);

  const fetchData = useCallback(
    async (userId: string, slugPath: string[], suppressLoading = false) => {
      const seq = ++fetchSeqRef.current;
      if (!suppressLoading) setIsLoading(true);
      try {
        let {
          folderId,
          breadcrumbs: resolvedBreadcrumbs,
          directParentId,
        } = await resolveFolderPath(userId, slugPath);

        // For invalid paths, redirect to /books
        if (slugPath.length > 0 && folderId === null) {
          console.warn(
            `Path resolution failed for slugs: ${slugPath.join("/")}. Redirecting to /books.`,
          );
          router.push("/books");
          return;
        }

        // Handle root: determine root status after resolving folderId to avoid transient state
        if (folderId === null && slugPath.length === 0) {
          folderId = await getRootId(userId);
          setIsRoot(true);
          resolvedBreadcrumbs = [{ id: null, name: "Home", slug: null }];
        } else {
          setIsRoot(false);
        }

        if (seq !== fetchSeqRef.current) return; // superseded — discard
        setCurrentFolderId(folderId);
        setParentFolderId(directParentId);
        setBreadcrumbs(resolvedBreadcrumbs);

        if (folderId) {
          const combined = await fetchUserBooksAndFolders(userId, folderId);
          if (seq !== fetchSeqRef.current) return; // superseded — discard
          setBooks(combined);
          setHasLoaded(true);
        }
      } catch (error) {
        console.error("Error loading data:", error);
        router.push("/books");
      } finally {
        if (!suppressLoading && seq === fetchSeqRef.current)
          setIsLoading(false);
      }
    },
    [router, resolveFolderPath],
  );

  // Check if user is logged in and fetch data
  useEffect(() => {
    const initializeAuth = async () => {
      // fetchData owns the loading flag (with seq guards against races),
      // so don't clear it here — a superseded init would otherwise flash
      // isLoading=false (and the empty state) while the latest fetch runs.
      setIsLoading(true);
      try {
        const user = await getCurrentUser();
        if (!user) {
          router.push("/signin");
          return;
        }
        setUserId(user.id);
        await fetchData(user.id, slugArray);
      } catch (error) {
        console.error("Auth Error:", error);
        router.push("/signin");
      }
    };

    initializeAuth();
  }, [router, slugArray, fetchData]);

  // Handle folder click (pass this down to BookList)
  const handleFolderClick = (folderId: string) => {
    const clickedFolder = books.find(
      (item) => item.isFolder && item.id === folderId,
    ) as Folder | undefined;

    if (clickedFolder?.slug) {
      const newPath = [...slugArray, clickedFolder.slug].join("/");
      router.push(withCurrentQuery(`/books/${newPath}`));
    } else if (folderId) {
      if (breadcrumbs.length > 1) {
        const parentCrumb = breadcrumbs[breadcrumbs.length - 2];
        handleBreadcrumbClick(parentCrumb);
      } else {
        router.push("/books");
      }
    }
  };

  const handleBreadcrumbClick = (crumb: {
    id: string | null;
    slug: string | null;
  }) => {
    if (!userId) return;
    const index = breadcrumbs.findIndex((c) => c.id === crumb.id);

    // Handle root
    if (index === -1) {
      router.push(withCurrentQuery("/books"));
      return;
    }
    const path = breadcrumbs
      .slice(1, index + 1)
      .map((c) => c.slug)
      .filter(Boolean)
      .join("/");
    router.push(withCurrentQuery(path ? `/books/${path}` : "/books"));
  };

  const handleCreateFolder = async () => {
    if (!userId || !currentFolderId) {
      console.error("User not logged in or current folder ID missing");
      return;
    }

    setFolderModalMode("create");
    setCurrentFolderName("");
    setIsFolderModalOpen(true);
  };

  const handleDeleteClick = async () => {
    if (!userId || !currentFolderId || isRoot) {
      console.error(
        "Cannot delete: User not logged in, folder ID missing, or trying to delete root.",
      );
      return;
    }

    setDeleteError(null);
    setDeleteCounts(null);
    setIsDeleteModalOpen(true);
    setDeleteCountsLoading(true);
    try {
      const [booksInFolder, subfolders] = await Promise.all([
        getBooksInFolder(currentFolderId, userId),
        getDirectSubfolders(currentFolderId, userId),
      ]);
      setDeleteCounts({
        books: booksInFolder.length,
        subfolders: subfolders.length,
      });
    } catch (error) {
      console.error("Error loading folder contents:", error);
      setDeleteError(
        `Could not load folder contents. ${error instanceof Error ? error.message : "Unknown error"}`,
      );
      setDeleteCounts({ books: 0, subfolders: 0 });
    } finally {
      setDeleteCountsLoading(false);
    }
  };

  const handleDeleteConfirm = async (mode: DeleteFolderMode) => {
    if (!userId || !currentFolderId || isRoot) {
      console.error(
        "Cannot delete: User not logged in, folder ID missing, or trying to delete root.",
      );
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    try {
      if (mode === "move") {
        let targetParentId = parentFolderId;
        if (!targetParentId) {
          targetParentId = await getRootId(userId);
        }
        if (!targetParentId) {
          throw new Error("Parent folder not found.");
        }
        await moveFolderContentsToParent(
          currentFolderId,
          targetParentId,
          userId,
        );
      } else {
        await deleteFolderRecursive(currentFolderId, userId);
      }
      setIsDeleteModalOpen(false);
      const parentCrumb = breadcrumbs[breadcrumbs.length - 2];
      if (parentCrumb) {
        handleBreadcrumbClick(parentCrumb);
      } else {
        router.push("/books");
      }
    } catch (error) {
      console.error("Error deleting folder:", error);
      setDeleteError(
        `Failed to delete folder. ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteModalClose = () => {
    if (isDeleting) return;
    setIsDeleteModalOpen(false);
    setDeleteError(null);
  };

  // Stable identity across unrelated re-renders so BookList's optimistic
  // drag order isn't reset by a fresh-but-identical array (e.g. a
  // setBreadcrumbs mid-fetch would otherwise snap the grid back).
  const visibleBooks = useMemo(
    () => books.filter((b) => !hiddenItemIds.includes(b.id)),
    [books, hiddenItemIds],
  );

  const normalizedQuery = query.trim().toLowerCase();

  type ViewBook = Extract<BookOrFolder, { isFolder: false }>;
  type ViewFolder = Extract<BookOrFolder, { isFolder: true }>;

  const booksInFolder = useMemo<ViewBook[]>(
    () =>
      visibleBooks.filter((item): item is ViewBook => !item.isFolder),
    [visibleBooks],
  );

  // Books filter by title/author (case-insensitive) and stay in server
  // sort_order (Custom order). Folders filter by name and stay in
  // sort_order/name order.
  const displayBooks = useMemo<ViewBook[]>(() => {
    const booksOnly = visibleBooks.filter(
      (item): item is ViewBook => !item.isFolder,
    );
    if (normalizedQuery === "") return booksOnly;
    return booksOnly.filter((book) =>
      `${book.title ?? ""} ${book.author ?? ""}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [visibleBooks, normalizedQuery]);

  // Folders filter by name only and always stay at the top in custom order.
  const displayFolders = useMemo<ViewFolder[]>(() => {
    const folders = visibleBooks.filter(
      (item): item is ViewFolder => item.isFolder === true,
    );
    const filtered =
      normalizedQuery === ""
        ? [...folders]
        : folders.filter((folder) =>
            (folder.name ?? "").toLowerCase().includes(normalizedQuery),
          );
    filtered.sort(
      (a, b) =>
        (a.sort_order ?? Number.MAX_SAFE_INTEGER) -
          (b.sort_order ?? Number.MAX_SAFE_INTEGER) ||
        (a.name ?? "").localeCompare(b.name ?? ""),
    );
    return filtered;
  }, [visibleBooks, normalizedQuery]);

  const displayItems = useMemo<BookOrFolder[]>(
    () => [...displayFolders, ...displayBooks],
    [displayFolders, displayBooks],
  );

  const isSearching = isSearchOpen && normalizedQuery !== "";

  // Global-results derived state. `showGlobalResults` flips on only after the
  // first debounced fetch lands so the underlying folder stays visible
  // meanwhile (stale results stay up while a newer query loads).
  const isDebouncing = isSearching && query.trim() !== debouncedQuery;
  const isFoldersLoading = isSearching && allFolders === null;
  const isGlobalPending = isSearching && (isDebouncing || globalLoading || isFoldersLoading);
  const showGlobalResults = isSearching && globalResults !== null;
  const globalCount = showGlobalResults
    ? globalResults.folders.length + globalResults.books.length
    : 0;
  const toolbarResultCount = showGlobalResults ? globalCount : displayItems.length;

  // Persisting a filtered subset would corrupt custom order, so dragging
  // pauses while searching and items render as static cards.
  const booksDragDisabled = isSearching;
  const foldersDragDisabled = isSearching;

  const resetGlobalSearchState = useCallback(() => {
    searchSeqRef.current++;
    setDebouncedQuery("");
    setGlobalResults(null);
    setGlobalLoading(false);
  }, []);

  // Empty-state action: clear the text but keep the row open for a new query.
  const clearSearch = useCallback(() => {
    setQuery("");
    resetGlobalSearchState();
    requestAnimationFrame(() => {
      document.getElementById("dashboard-search-input")?.focus();
    });
  }, [resetGlobalSearchState]);

  // Collapsing the row always clears the query (and the ?q= param via the
  // debounced sync above) so full drag-and-drop is restored.
  const closeSearch = useCallback(() => {
    setQuery("");
    setIsSearchOpen(false);
    resetGlobalSearchState();
    setAllFolders(null);
  }, [resetGlobalSearchState]);

  const toggleSearch = useCallback(() => {
    if (isSearchOpen) {
      setQuery("");
      setIsSearchOpen(false);
      resetGlobalSearchState();
      setAllFolders(null);
    } else {
      setIsSearchOpen(true);
    }
  }, [isSearchOpen, resetGlobalSearchState]);

  // X / Escape close: return focus to the toggle for keyboard users.
  const handleSearchClose = useCallback(() => {
    closeSearch();
    requestAnimationFrame(() => {
      searchToggleRef.current?.focus();
    });
  }, [closeSearch]);

  // Global folder rows navigate INTO the folder via its slug path and clear
  // search (unlike in-folder navigation, the query is never preserved).
  const handleGlobalFolderClick = useCallback(
    (folderId: string) => {
      const target = globalResults?.folders.find((f) => f.id === folderId);
      const slugPath = target?.slugPath ?? "";
      setQuery("");
      setIsSearchOpen(false);
      resetGlobalSearchState();
      setAllFolders(null);
      router.push(slugPath ? `/books/${slugPath}` : "/books");
    },
    [globalResults, resetGlobalSearchState, router],
  );

  // Refresh while optionally hiding a single item (used for drag/drop)
  const refreshAndHide = async (hideId?: string) => {
    if (!userId) return;
    if (hideId) {
      setHiddenItemIds((s) => Array.from(new Set([...s, hideId])));
      // A moved item changes a subfolder's contents, but FolderCard fetches
      // its preview on mount only — bump the version so it refetches now.
      setFolderPreviewVersion((v) => v + 1);
    }
    try {
      await fetchData(userId, slugArray, true);
    } finally {
      // Clear hidden IDs after refresh completes
      setHiddenItemIds([]);
    }
  };

  const handleRenameFolder = async () => {
    if (!userId || !currentFolderId) {
      console.error("User not logged in or current folder ID missing");
      return;
    }

    setFolderModalMode("rename");
    setCurrentFolderName(breadcrumbs[breadcrumbs.length - 1]?.name || "");
    setIsFolderModalOpen(true);
  };

  const handleFolderModalConfirm = async (folderName: string) => {
    if (!userId || !currentFolderId) return;

    try {
      if (folderModalMode === "create") {
        setIsLoading(true);
        await createFolder(folderName, userId, currentFolderId);
        await fetchData(userId, slugArray);
      } else if (folderModalMode === "rename") {
        await updateFolderName(currentFolderId, folderName, userId);
        // Compute new slug and update URL
        const newSlug = folderName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-") // replace non-alphanumeric with hyphen
          .replace(/(^-|-$)+/g, ""); // trim hyphens
        const newSlugArray = [...slugArray];
        newSlugArray[newSlugArray.length - 1] = newSlug;
        const newPath = newSlugArray.join("/");
        router.push(newPath ? `/books/${newPath}` : "/books");
      }
      setIsFolderModalOpen(false);
    } catch (error) {
      console.error(
        `Error ${folderModalMode === "create" ? "creating" : "renaming"} folder:`,
        error,
      );
      alert(
        `Failed to ${folderModalMode === "create" ? "create" : "rename"} folder. ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!hasLoaded && !books.length && !isDeleting) {
    return (
      <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
        <div className="max-w-[95rem] mx-auto space-y-6">
          <h1 className="text-3xl font-bold text-foreground">📚 Dashboard</h1>
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 lg:p-8">
      <div className="max-w-[95rem] mx-auto space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-foreground">📚 Dashboard</h1>

            {/* Breadcrumbs */}
            {breadcrumbs.length > 1 && (
              <nav className="flex" aria-label="Breadcrumb">
                <ol className="flex items-center space-x-2 text-sm">
                  {breadcrumbs.map((crumb, index) => (
                    <li key={crumb.id || "home"} className="flex items-center">
                      {index > 0 && (
                        <svg
                          className="h-4 w-4 text-grey2 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                      <button
                        onClick={() => handleBreadcrumbClick(crumb)}
                        className={`text-sm font-medium ${
                          index === breadcrumbs.length - 1
                            ? "text-foreground cursor-default"
                            : "text-grey2 hover:text-primary "
                        }`}
                        disabled={index === breadcrumbs.length - 1}
                      >
                        {crumb.name}
                      </button>
                    </li>
                  ))}
                </ol>
              </nav>
            )}
          </div>

          {/* Delete Button */}
          {!isRoot && currentFolderId && (
            <div className="flex gap-2">
              {" "}
              {/* Container for folder action buttons */}
              {/* Rename Button */}
              <button
                onClick={handleRenameFolder} // Add a handler function for renaming
                disabled={isLoading || isDeleting}
                className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                title={`Rename folder: ${breadcrumbs[breadcrumbs.length - 1]?.name}`}
              >
                {/* Add isRenaming state check for loading indicator */}
                {false ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Renaming...
                  </>
                ) : (
                  <>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="mr-2 h-4 w-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                    Rename
                  </>
                )}
              </button>
              {/* Existing Delete Button */}
              <button
                onClick={handleDeleteClick}
                disabled={isLoading || isDeleting}
                className="inline-flex items-center px-4 py-2 rounded-md text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 transition-colors"
                title={`Delete folder: ${breadcrumbs[breadcrumbs.length - 1]?.name}`}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleCreateFolder}
            disabled={isLoading || isDeleting || !currentFolderId}
            className="inline-flex items-center px-4 py-2 rounded-md shadow-sm text-lg font-medium text-foreground bg-primary duration-200 ease-in-out cursor-pointer transform hover:scale-105 transition-transform will-change-transform"
          >
            {isLoading && !isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              "Create Folder"
            )}
          </button>

          <Link
            href="/search"
            className="inline-flex items-center px-6 py-3 rounded-md shadow-sm text-lg font-medium text-foreground bg-secondary duration-200 ease-in-out cursor-pointer transform hover:scale-105 transition-transform will-change-transform"
          >
            Add Books
          </Link>

          {/* Search toggle — expands the search row below */}
          <button
            ref={searchToggleRef}
            type="button"
            onClick={toggleSearch}
            aria-expanded={isSearchOpen}
            aria-label={isSearchOpen ? "Close search" : "Open search"}
            title={isSearchOpen ? "Close search" : "Search your library"}
            className={`ml-auto inline-flex items-center gap-2 rounded-md px-4 py-2 text-lg font-medium shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
              isSearchOpen
                ? "bg-primary/10 text-primary"
                : "border border-grey4 bg-background text-foreground hover:bg-muted"
            }`}
          >
            <Search className="h-5 w-5" aria-hidden="true" />
            <span className="hidden sm:inline">Search</span>
          </button>
        </div>

        {/* Collapsible search row */}
        <AnimatePresence initial={false}>
          {isSearchOpen && (
            <motion.div
              key="dashboard-search"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              <BookToolbar
                query={query}
                onQueryChange={setQuery}
                onClose={handleSearchClose}
                resultCount={toolbarResultCount}
                totalCount={visibleBooks.length}
                isSearching={isSearching}
                isGlobal
                isLoading={isGlobalPending}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Area */}
        {isLoading || !hasLoaded ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
          </div>
        ) : isSearching ? (
          showGlobalResults ? (
            globalCount === 0 && !isGlobalPending ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-xl font-semibold text-foreground">
                  No matches in your library
                </p>
                <p className="mt-1 text-sm text-grey2">
                  Try a different search or clear the search.
                </p>
                <button
                  type="button"
                  onClick={clearSearch}
                  className="mt-4 inline-flex items-center px-4 py-2 rounded-md shadow-sm text-sm font-medium text-foreground bg-primary duration-200 ease-in-out cursor-pointer transform hover:scale-105 transition-transform will-change-transform"
                >
                  Clear search
                </button>
              </div>
            ) : (
              <div className="space-y-6" aria-label="Library search results">
                {isGlobalPending && (
                  <div
                    className="flex items-center gap-2 text-sm text-grey2"
                    role="status"
                    aria-live="polite"
                    aria-label="Searching your library"
                  >
                    <Loader2
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    <span>Searching your library…</span>
                  </div>
                )}
                {globalResults!.folders.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2.5">
                    {globalResults!.folders.map((folder) => (
                      <div key={folder.id} className="min-w-0">
                        <FolderCard
                          folder={folder}
                          dragDisabled
                          refreshKey={folderPreviewVersion}
                          onFolderClick={(id: string) =>
                            handleGlobalFolderClick(id)
                          }
                        />
                        <p
                          className="mt-1 truncate text-[11px] text-grey2"
                          title={`in ${folder.locationPath}`}
                        >
                          in {folder.locationPath}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {globalResults!.folders.length > 0 &&
                  globalResults!.books.length > 0 && <div className="h-6" />}
                {globalResults!.books.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3">
                    {globalResults!.books.map((book) => (
                      <div key={book.id} className="min-w-0">
                        <BookCard book={book} sortable={false} />
                        <p
                          className="mt-1 truncate text-[11px] text-grey2"
                          title={`in ${book.locationPath}`}
                        >
                          in {book.locationPath}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          ) : (
            // First debounced fetch still pending: keep the exact folder view
            // visible with a small spinner until global results arrive.
            <div className="space-y-4">
              <div
                className="flex items-center gap-2 text-sm text-grey2"
                role="status"
                aria-live="polite"
                aria-label="Searching your library"
              >
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Searching your library…</span>
              </div>
              <BookList
                items={visibleBooks}
                onFolderClick={handleFolderClick}
                folderId={currentFolderId}
                parentFolderId={parentFolderId}
                parentFolderSlug={
                  breadcrumbs.length > 1
                    ? breadcrumbs[breadcrumbs.length - 2].slug
                    : null
                }
                onRefresh={(hideId?: string) => refreshAndHide(hideId)}
                breadcrumbs={breadcrumbs}
                isRoot={isRoot}
                refreshKey={folderPreviewVersion}
                booksDragDisabled={booksDragDisabled}
                foldersDragDisabled={foldersDragDisabled}
              />
            </div>
          )
        ) : books.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-grey2">
            <div className="text-3xl font-bold mb-4">
              Add some books to your collection to get started!
            </div>
            <Link
              href="/search"
              className="mt-2 inline-block px-6 py-3 rounded-md shadow-sm text-lg leading-none text-foreground bg-primary hover:bg-primary/80  duration-200 ease-in-out cursor-pointer transform hover:scale-105 transition-transform will-change-transform"
            >
              <span className="block">Get Started!</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              {
                // Hide any items that are currently being hidden during a drag/drop refresh
              }
              <BookList
                items={displayItems}
                onFolderClick={handleFolderClick}
                folderId={currentFolderId}
                parentFolderId={parentFolderId}
                parentFolderSlug={
                  breadcrumbs.length > 1
                    ? breadcrumbs[breadcrumbs.length - 2].slug
                    : null
                }
                onRefresh={(hideId?: string) => refreshAndHide(hideId)}
                breadcrumbs={breadcrumbs}
                isRoot={isRoot}
                refreshKey={folderPreviewVersion}
                booksDragDisabled={booksDragDisabled}
                foldersDragDisabled={foldersDragDisabled}
              />
              {/* BookList renders nothing at root when empty, but in a
               * subfolder it still shows the "go up" button — so an empty
               * folder keeps its way back alongside this message. */}
              {books.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-center text-grey2">
                  <div className="text-3xl font-bold mb-4">
                    Add some books to your collection to get started!
                  </div>
                  <Link
                    href="/search"
                    className="mt-2 inline-block px-6 py-3 rounded-md shadow-sm text-lg leading-none text-foreground bg-primary hover:bg-primary/80  duration-200 ease-in-out cursor-pointer transform hover:scale-105 transition-transform will-change-transform"
                  >
                    <span className="block">Get Started!</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <FolderNameModal
        isOpen={isFolderModalOpen}
        onClose={() => setIsFolderModalOpen(false)}
        onConfirm={handleFolderModalConfirm}
        title={
          folderModalMode === "create" ? "Create New Folder" : "Rename Folder"
        }
        confirmButtonText={folderModalMode === "create" ? "Create" : "Rename"}
        initialName={currentFolderName}
        isLoading={isLoading}
      />

      <DeleteFolderModal
        isOpen={isDeleteModalOpen}
        onClose={handleDeleteModalClose}
        onConfirm={handleDeleteConfirm}
        folderName={breadcrumbs[breadcrumbs.length - 1]?.name || "this folder"}
        parentName={
          breadcrumbs.length > 1
            ? breadcrumbs[breadcrumbs.length - 2]?.name || "parent folder"
            : "parent folder"
        }
        bookCount={deleteCounts?.books ?? 0}
        subfolderCount={deleteCounts?.subfolders ?? 0}
        countsLoading={deleteCountsLoading}
        isLoading={isDeleting}
        error={deleteError}
      />
    </div>
  );
}
