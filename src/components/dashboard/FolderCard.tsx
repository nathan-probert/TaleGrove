"use client";

import { Book, Folder } from "@/types";
import { motion } from "framer-motion";
import { FolderIcon, ArrowLeftIcon, BookOpen } from "lucide-react";
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
  /** Render nothing in the grid: display:none removes the cell so ranks
   *  close as if already moved, while the sortable node stays mounted and
   *  registered so the in-flight drag (and its data) survives. */
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

  const booksToDisplay = books.slice(0, 4);
  const isGoUp = folder.parent_id === null;

  const collageGrid =
    booksToDisplay.length <= 1
      ? "grid grid-cols-1 grid-rows-1"
      : booksToDisplay.length === 2
        ? "grid grid-cols-2 grid-rows-1"
        : "grid grid-cols-2 grid-rows-2";

  const highlight = highlighted || (droppableId && droppableState.isOver);

  const content = (
    <div className="w-full text-left group flex items-center gap-2.5 p-2.5 h-full min-h-[68px]">
      {/* Square collage thumbnail: up to 4 covers, else large folder icon */}
      <div className="relative shrink-0 w-[52px] h-[52px] rounded-md overflow-hidden border border-gray-200 bg-primary/10 flex items-center justify-center">
        {isGoUp ? (
          <ArrowLeftIcon className="w-6 h-6 text-primary" />
        ) : booksToDisplay.length === 0 ? (
          <FolderIcon className="w-6 h-6 text-primary" />
        ) : (
          <div className={`w-full h-full ${collageGrid} gap-px bg-gray-200`}>
            {booksToDisplay.map((book, index) => (
              <div
                key={book.id || index}
                className="relative w-full h-full overflow-hidden bg-background"
              >
                {book.cover_url ? (
                  <Image
                    src={book.cover_url}
                    alt={book.title}
                    className="object-cover w-full h-full"
                    fill
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-grey4/20">
                    <BookOpen className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Folder name + count */}
      <div className="flex-1 min-w-0">
        <h3
          className="text-sm font-medium text-foreground line-clamp-1"
          title={folder.name}
        >
          {folder.name}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {isGoUp
            ? "Go up"
            : books.length > 0
              ? `${books.length} book${books.length === 1 ? "" : "s"}`
              : "Folder"}
        </p>
      </div>

      {!isGoUp && (
        <FolderIcon className="w-5 h-5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
      )}
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
      className={`h-full cursor-grab active:cursor-grabbing outline-none ${
        placeholder ? "hidden" : ""
      }`}
    >
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
    </div>
  );
}
