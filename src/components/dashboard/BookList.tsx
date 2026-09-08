"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  closestCenter,
  defaultAnnouncements,
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { BookOrFolder, Folder } from "@/types";
import FolderCard from "@/components/dashboard/FolderCard";
import BookCard from "./BookCard";
import {
  addBookToFolder,
  addFolderToFolder,
  persistBookOrder,
  persistFolderOrder,
} from "@/lib/supabase";

interface Props {
  items: BookOrFolder[];
  onFolderClick: (folderId: string) => void;
  folderId: string | null;
  parentFolderId?: string | null;
  parentFolderSlug?: string | null;
  onRefresh: (hideId?: string) => void;
  breadcrumbs?: { id: string | null; name: string; slug: string | null }[];
  isRoot: boolean;
}

type SortableFolder = Folder & { isFolder: true };

/** Droppable id for the "go up" button (move books/folders up one level). */
const GO_UP_ID = "go-up";

/** Long-hover (spring-load) delay before a book auto-moves into a folder. */
const HOVER_MOVE_DELAY_MS = 600;

/** Window after a drag ends during which clicks are swallowed. */
const CLICK_SUPPRESS_MS = 250;

const screenReaderInstructions = {
  draggable:
    "To pick up an item, press space. Use the arrow keys to reorder it, space again to drop, and escape to cancel.",
};

export default function BookList({
  items,
  onFolderClick,
  folderId,
  parentFolderId,
  parentFolderSlug,
  onRefresh,
  breadcrumbs = [],
  isRoot,
}: Props) {
  const parentCrumb = breadcrumbs[breadcrumbs.length - 2];

  const goUpFolder: SortableFolder = useMemo(
    () => ({
      id: parentFolderId ?? "null",
      name: parentCrumb?.name ?? "Home",
      slug: parentFolderSlug ?? "null",
      user_id: "",
      parent_id: null,
      isFolder: true,
      sort_order: -1,
    }),
    [parentFolderId, parentCrumb?.name, parentFolderSlug],
  );

  const splitItems = (list: BookOrFolder[]) => ({
    folders: list.filter((i): i is SortableFolder => i.isFolder),
    books: list.filter((i): i is BookOrFolder & { isFolder: false } => !i.isFolder),
  });

  const [orderedFolders, setOrderedFolders] = useState<SortableFolder[]>(() =>
    splitItems(items).folders,
  );
  const [orderedBooks, setOrderedBooks] = useState<
    (BookOrFolder & { isFolder: false })[]
  >(() => splitItems(items).books);
  const [activeItem, setActiveItem] = useState<BookOrFolder | null>(null);
  const [overFolderId, setOverFolderId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Ids optimistically hidden because a move into another folder was
  // initiated (drop or spring-load) but the confirming refresh hasn't landed
  // yet. Bridges the network gap so a moved item can't pop back meanwhile.
  const [movedAwayIds, setMovedAwayIds] = useState<string[]>([]);

  // Mirrors of in-flight drag state for use inside timeouts/handlers.
  const activeIdRef = useRef<string | null>(null);
  const originalOrderRef = useRef<{ folders: string[]; books: string[] }>({
    folders: [],
    books: [],
  });
  const movedRef = useRef<string | null>(null); // "bookId->targetId" after a spring-load move
  const lastDragEndRef = useRef<number>(0);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep local order in sync with the server — but never clobber an
  // in-progress optimistic drag preview.
  useEffect(() => {
    if (activeIdRef.current) return;
    const { folders, books } = splitItems(items);
    // A confirming refresh lists everything except moved-away items: prune
    // their hide-entries now that the server agrees they're gone.
    const serverIds = new Set([...folders, ...books].map((i) => i.id));
    setMovedAwayIds((prev) => {
      if (prev.length === 0) return prev;
      const next = prev.filter((id) => serverIds.has(id));
      return next.length === prev.length ? prev : next;
    });
    setOrderedFolders(folders);
    setOrderedBooks(books);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // Auto-dismiss error banner.
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error]);

  const sensors = useSensors(
    // distance constraint preserves click-to-open vs drag
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: HOVER_MOVE_DELAY_MS - 350, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const folderIds = useMemo(
    () => orderedFolders.map((f) => f.id),
    [orderedFolders],
  );
  const bookIds = useMemo(() => orderedBooks.map((b) => b.id), [orderedBooks]);

  const revertToServerOrder = () => {
    const { folders, books } = splitItems(items);
    setOrderedFolders(folders);
    setOrderedBooks(books);
  };

  const showError = (message: string) => setError(message);

  const userIdFor = (item: BookOrFolder): string | null =>
    item.user_id || items[0]?.user_id || null;

  /** Move a book into a folder (or up one level via GO_UP_ID). */
  const moveBookIntoFolder = async (book: BookOrFolder, targetId: string) => {
    const moveKey = `${book.id}->${targetId}`;
    if (movedRef.current === moveKey) return;
    const uid = userIdFor(book);
    if (!uid) {
      showError("Could not move book: missing user.");
      return;
    }
    // Optimistically hide from this grid at once — the refresh confirming
    // the move lands ~0.5s later, and the item must not pop back meanwhile.
    setMovedAwayIds((prev) =>
      prev.includes(book.id) ? prev : [...prev, book.id],
    );
    try {
      if (targetId === GO_UP_ID) {
        await addBookToFolder(
          book.id,
          folderId ?? "",
          parentFolderId ?? null,
          uid,
        );
      } else {
        if (!folderId) {
          showError("Could not move book: missing folder.");
          return;
        }
        await addBookToFolder(book.id, folderId, targetId, uid);
      }
      movedRef.current = moveKey;
      onRefresh(book.id);
    } catch (e) {
      // PostgREST errors are plain objects — stringify so the message/code
      // survive instead of logging as {}.
      console.error(
        "Failed to move book:",
        e instanceof Error ? e.message : JSON.stringify(e),
        { bookId: book.id, fromFolder: folderId, toFolder: targetId },
      );
      movedRef.current = null;
      // Restore the grid: un-hide and roll back to server order.
      setMovedAwayIds((prev) => prev.filter((id) => id !== book.id));
      revertToServerOrder();
      showError("Could not move book. Please try again.");
    }
  };

  const clearHoverTimer = () => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };

  const resetDragState = () => {
    setActiveItem(null);
    setOverFolderId(null);
    activeIdRef.current = null;
    clearHoverTimer();
  };

  // Spring-loading: lingering a book over a folder moves it without a drop.
  useEffect(() => {
    if (!activeItem || activeItem.isFolder || !overFolderId) return;
    if (movedRef.current?.startsWith(`${activeItem.id}->`)) return;
    const book = activeItem;
    const target = overFolderId;
    hoverTimerRef.current = setTimeout(() => {
      if (activeIdRef.current === book.id) {
        void moveBookIntoFolder(book, target);
      }
    }, HOVER_MOVE_DELAY_MS);
    return () => clearHoverTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeItem, overFolderId]);

  const handleDragStart = (event: DragStartEvent) => {
    const id = String(event.active.id);
    const found =
      orderedFolders.find((f) => f.id === id) ??
      orderedBooks.find((b) => b.id === id) ??
      null;
    activeIdRef.current = id;
    movedRef.current = null;
    originalOrderRef.current = {
      folders: orderedFolders.map((f) => f.id),
      books: orderedBooks.map((b) => b.id),
    };
    setActiveItem(found);
    setOverFolderId(null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) {
      setOverFolderId(null);
      return;
    }
    const activeId = String(active.id);
    const overId = String(over.id);
    // Folder onto itself: no-op (descendant drops are impossible — only
    // siblings of the current level are rendered).
    if (activeId === overId) return;

    const activeType = active.data.current?.type as string | undefined;
    const overType = over.data.current?.type as string | undefined;

    if (activeType === "book" && (overType === "folder" || overId === GO_UP_ID)) {
      // Book over folder: highlight only, never shift (groups never interleave).
      setOverFolderId(overId);
      return;
    }

    if (overId === GO_UP_ID) {
      // Folder over "go up": highlight as a move-up target.
      setOverFolderId(activeType === "folder" ? overId : null);
      return;
    }

    setOverFolderId(null);

    // Same-type groups: optimistic live preview via arrayMove.
    if (activeType === "book" && overType === "book") {
      setOrderedBooks((prev) => {
        const oldIndex = prev.findIndex((b) => b.id === activeId);
        const newIndex = prev.findIndex((b) => b.id === overId);
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex)
          return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
    } else if (activeType === "folder" && overType === "folder") {
      setOrderedFolders((prev) => {
        const oldIndex = prev.findIndex((f) => f.id === activeId);
        const newIndex = prev.findIndex((f) => f.id === overId);
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex)
          return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
    // Other cross-type pairs (e.g. folder over book): ignore, never interleave.
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    lastDragEndRef.current = Date.now();
    clearHoverTimer();

    const activeId = String(active.id);
    const overId = over ? String(over.id) : null;
    const activeType = active.data.current?.type as string | undefined;
    const overType = over?.data.current?.type as string | undefined;
    const currentActive = activeItem;
    const finalFolders = orderedFolders;
    const finalBooks = orderedBooks;
    const original = originalOrderRef.current;

    setOverFolderId(null);
    setActiveItem(null);
    activeIdRef.current = null;

    // Already spring-moved on hover: the refresh is in flight. Drop the
    // local ghost too, so the moved item can't pop back into this grid —
    // the confirming refresh will already exclude it server-side.
    if (movedRef.current?.startsWith(`${activeId}->`)) {
      setOrderedBooks((prev) => prev.filter((b) => b.id !== activeId));
      setOrderedFolders((prev) => prev.filter((f) => f.id !== activeId));
      setMovedAwayIds((prev) => prev.filter((id) => id !== activeId));
      return;
    }

    if (!currentActive || !over) {
      revertToServerOrder();
      return;
    }
    // Note: activeId === overId is NOT a no-op. The optimistic arrayMove in
    // onDragOver shifts the dragged item under the pointer, so `over` is
    // often the active item itself at drop time. The same-type branches
    // below diff against the original order and skip persisting when
    // nothing actually moved.

    const uid = userIdFor(currentActive);
    if (!uid) {
      showError("Could not save order: missing user.");
      revertToServerOrder();
      return;
    }

    try {
      // Cross-type drop: move, not reorder.
      if (
        activeType === "book" &&
        (overType === "folder" || overId === GO_UP_ID)
      ) {
        await moveBookIntoFolder(currentActive, overId!);
        return;
      }
      if (activeType === "folder" && overId === GO_UP_ID && !isRoot) {
        // Optimistically hide, same as book moves — the refresh lands later.
        setMovedAwayIds((prev) =>
          prev.includes(activeId) ? prev : [...prev, activeId],
        );
        await addFolderToFolder(
          activeId,
          parentFolderId ?? null,
          uid,
        );
        movedRef.current = `${activeId}->${overId}`;
        onRefresh(activeId);
        return;
      }
      // Same-type drop: persist once if the order actually changed.
      if (activeType === "book" && overType === "book") {
        const ids = finalBooks.map((b) => b.id);
        if (JSON.stringify(ids) === JSON.stringify(original.books)) return;
        if (!folderId) {
          revertToServerOrder();
          return;
        }
        await persistBookOrder(folderId, ids, uid);
        onRefresh();
        return;
      }
      if (activeType === "folder" && overType === "folder") {
        const ids = finalFolders.map((f) => f.id);
        if (JSON.stringify(ids) === JSON.stringify(original.folders)) return;
        await persistFolderOrder(folderId, ids, uid);
        onRefresh();
        return;
      }
      // Anything else (e.g. folder dropped over a book): revert.
      revertToServerOrder();
    } catch (e) {
      console.error("Failed to save drag result:", e);
      setMovedAwayIds((prev) => prev.filter((id) => id !== activeId));
      revertToServerOrder();
      showError("Could not save changes. Please try again.");
      onRefresh();
    }
  };

  const handleDragCancel = () => {
    lastDragEndRef.current = Date.now();
    revertToServerOrder();
    resetDragState();
  };

  // Swallow the click that the browser emits right after a drag ends so a
  // reorder never navigates into a book/folder.
  const handleClickCapture = (e: React.SyntheticEvent) => {
    if (Date.now() - lastDragEndRef.current < CLICK_SUPPRESS_MS) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  const showFolderGrid = orderedFolders.length > 0 || !isRoot;
  const showBookGrid = orderedBooks.length > 0;

  // While a book is held over a folder (about to move inside), collapse its
  // grid cell so the preview no longer shows it here. The sortable node
  // stays mounted (placeholder shell), so the in-flight drag never breaks —
  // dragging back out restores the card at its optimistic position.
  // movedAwayIds extends the same hiding across the post-drop network gap.
  const hiddenDragBookId =
    activeItem && !activeItem.isFolder && overFolderId !== null
      ? activeItem.id
      : null;
  const hiddenDragFolderId =
    activeItem && activeItem.isFolder && overFolderId === GO_UP_ID
      ? activeItem.id
      : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      accessibility={{
        announcements: defaultAnnouncements,
        screenReaderInstructions,
      }}
    >
      <div onClickCapture={handleClickCapture}>
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800"
          >
            {error}
          </div>
        )}

        {showFolderGrid && (
          <SortableContext
            items={folderIds}
            strategy={rectSortingStrategy}
          >
            <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-5 gap-4">
              {!isRoot && (
                <FolderCard
                  key={goUpFolder.id + ":go-up"}
                  folder={goUpFolder}
                  sortable={false}
                  droppableId={GO_UP_ID}
                  highlighted={overFolderId === GO_UP_ID}
                  onFolderClick={(id: string) => {
                    if (id === "__go_up__") {
                      if (parentCrumb) {
                        onFolderClick(parentCrumb.id || "");
                      }
                    } else {
                      onFolderClick(id);
                    }
                  }}
                />
              )}
              {orderedFolders.map((folder) => (
                <FolderCard
                  key={folder.id}
                  folder={folder}
                  highlighted={overFolderId === folder.id}
                  placeholder={
                    movedAwayIds.includes(folder.id) ||
                    folder.id === hiddenDragFolderId
                  }
                  onFolderClick={(id: string) => {
                    if (id === "__go_up__") {
                      if (parentCrumb) {
                        onFolderClick(parentCrumb.id || "");
                      }
                    } else {
                      onFolderClick(id);
                    }
                  }}
                />
              ))}
            </div>
          </SortableContext>
        )}

        {showFolderGrid && showBookGrid && <div className="h-6" />}

        {showBookGrid && (
          <SortableContext items={bookIds} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-4 md:grid-cols-5 lg:grid-cols-5 gap-4">
              {orderedBooks.map((book) => (
                <BookCard
                  key={book.id}
                  book={book}
                  placeholder={
                    movedAwayIds.includes(book.id) ||
                    book.id === hiddenDragBookId
                  }
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </DndContext>
  );
}
