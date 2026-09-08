"use client";

import { Book, Folder } from "@/types";
import { motion } from "framer-motion";
import { Book as BookIcon, FolderIcon, ArrowLeftIcon } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { getBooksInFolder } from "@/lib/supabase";
import { useEffect, useState } from "react";
import Image from "next/image";

interface FolderCardProps {
  folder: Folder;
  onFolderClick?: (folderId: string, name: string) => void;
  onRefresh?: (hideId?: string) => void;
  /** false for the "go up" pseudo-folder: not draggable/sortable */
  sortable?: boolean;
  /** true while a dragged book hovers this folder: drop-target highlight */
  highlighted?: boolean;
  /** Render a collapsed shell: keeps the sortable node mounted (so an
   *  in-flight drag survives) while removing the card from the preview. */
  placeholder?: boolean;
  /**
   * When provided (used for the "go up" button), registers an additional
   * droppable target so books can be moved up one level.
   */
  droppableId?: string | null;
}

export default function FolderCard({
  folder,
  onFolderClick,
  sortable = true,
  highlighted = false,
  droppableId = null,
  placeholder = false,
}: FolderCardProps) {
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    // Only fetch books if it's not the 'back' folder representation
    if (folder.parent_id !== null) {
      getBooksInFolder(folder.id, folder.user_id).then((books) => {
        setBooks(books);
      });
    }
  }, [folder.id, folder.user_id, folder.parent_id]);

  const sortableState = useSortable({
    id: folder.id,
    data: { type: "folder", folder },
    disabled: !sortable,
  });

  const droppableState = useDroppable({
    id: droppableId ?? `folder-drop:${folder.id}`,
    data: { type: "folder-drop", folder },
    disabled: !droppableId,
  });

  const handleClick = () => {
    if (sortable && sortableState.isDragging) return;
    if (onFolderClick) {
      onFolderClick(folder.id, folder.name);
    }
  };

  // Determine grid class based on the number of books
  const getGridClass = (count: number) => {
    if (count === 1) return "grid grid-cols-1 grid-rows-1";
    if (count === 2) return "grid grid-cols-2 grid-rows-1";
    if (count === 3)
      return "grid grid-cols-2 grid-rows-2 [&>*:nth-child(3)]:col-span-2 [&>*:nth-child(3)]:w-1/2 [&>*:nth-child(3)]:justify-self-center";
    return "grid grid-cols-2 grid-rows-2";
  };

  const booksToDisplay = books.slice(0, 4);
  const gridClass = getGridClass(booksToDisplay.length);

  const highlight = highlighted || (droppableId && droppableState.isOver);

  const content = (
    <div className="w-full text-left group flex flex-col h-full p-4">
      {/* Visual Representation Area */}
      <div
        className={`w-full bg-grey4/20 rounded-lg overflow-hidden relative aspect-square mb-4 ${booksToDisplay.length > 0 ? `${gridClass} gap-2` : "flex items-center justify-center"}`}
      >
        {booksToDisplay.length === 0 ? (
          folder.parent_id === null ? (
            <ArrowLeftIcon className="w-24 h-24 sm:w-36 sm:h-36 text-primary" />
          ) : (
            <FolderIcon className="w-24 h-24 sm:w-36 sm:h-36 text-primary" />
          )
        ) : (
          <>
            {booksToDisplay.map((book, index) => (
              <div
                key={book.id || index}
                className="w-full h-full overflow-hidden rounded-md border border-gray-200 bg-background"
              >
                {book.cover_url ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={book.cover_url}
                      alt={book.title}
                      className="object-cover w-full h-full rounded-sm"
                      fill
                      unoptimized
                    />
                  </div>
                ) : (
                  <div className="w-full h-full bg-grey3 flex items-center justify-center rounded-md">
                    <BookIcon className="w-6 h-6 text-grey1" />
                  </div>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Folder Name */}
      <div className="flex-1">
        <h3 className="text-xl font-semibold text-foreground line-clamp-2">
          {folder.name}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2">Folder</p>
      </div>
    </div>
  );

  if (!sortable) {
    // "Go up" pseudo-folder: clickable + droppable for books, never draggable.
    return (
      <div
        ref={droppableState.setNodeRef}
        className="h-full outline-none"
      >
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleClick}
          className={`group relative flex flex-col h-full rounded-lg bg-background shadow-sm border overflow-hidden transition-shadow cursor-pointer hover:shadow-md ${
            highlight
              ? "border-primary ring-2 ring-primary"
              : "border-primary"
          }`}
          style={{
            backgroundColor: highlight
              ? "var(--grey5)"
              : "var(--background)",
          }}
        >
          {content}
        </motion.div>
      </div>
    );
  }

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    sortableState;

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        touchAction: "manipulation",
        zIndex: isDragging ? 10 : undefined,
      }}
      {...attributes}
      {...listeners}
      className="h-full cursor-grab active:cursor-grabbing outline-none"
    >
      {placeholder ? (
        <div aria-hidden className="h-0 overflow-hidden" />
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleClick}
          className={`group relative flex flex-col h-full rounded-lg bg-background shadow-sm border overflow-hidden transition-shadow cursor-pointer hover:shadow-md ${
            highlight || isDragging
              ? "border-primary ring-2 ring-primary"
              : "border-primary"
          }`}
          style={{
            backgroundColor:
              highlight && !isDragging ? "var(--grey5)" : "var(--background)",
          }}
        >
          {content}
        </motion.div>
      )}
    </div>
  );
}
