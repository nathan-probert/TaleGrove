"use client";

import { Book } from "@/types";
import { motion } from "framer-motion";
import Image from "next/image";
import { BookOpen, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface CardProps {
  book: Book;
  folderId?: string | null;
  parentFolderId?: string | null;
  refresh?: (hideId?: string) => void;
  isDraggable?: boolean;
  isSearch?: boolean;
  /** Render nothing in the grid: display:none removes the cell so ranks
   *  close as if already moved, while the sortable node stays mounted and
   *  registered so the in-flight drag (and its data) survives. */
  placeholder?: boolean;
}

interface BaseCardProps {
  book: Book;
  isSearch?: boolean;
  handleClick: () => void;
}

function BaseCard({ book, isSearch = false, handleClick }: BaseCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="group relative flex flex-col h-full rounded-lg bg-background shadow-sm hover:shadow-md border-primary transition-shadow border"
    >
      <button
        onClick={handleClick}
        className="cursor-pointer w-full text-left group flex flex-col h-full p-4 relative"
      >
        <div className="w-full bg-background border-foreground rounded-lg overflow-hidden aspect-[2/3] mb-4 border">
          {book.cover_url ? (
            <Image
              src={book.cover_url}
              alt={book.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              width={400}
              height={600}
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <BookOpen className="w-12 h-12 text-grey3" />
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col">
          <h3
            className="text-lg font-semibold text-foreground mb-1 line-clamp-2 group-hover:text-primary "
            title={book.title}
          >
            {(book.title ?? "").length > 50
              ? `${(book.title ?? "").slice(0, 50)}…`
              : book.title}
          </h3>
          <p className="text-sm text-grey2 line-clamp-1 mb-2">
            {book.author || "Unknown Author"}
          </p>

          {!isSearch && (
            <div className="flex items-center gap-3 mt-auto">
              <span
                className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm md:text-base font-medium ${
                  book.status === "completed"
                    ? "bg-green-700 text-white"
                    : "bg-blue-100 text-blue-800"
                }`}
              >
                {book.status}
              </span>
              {book.rating && (
                <div className="flex items-center text-base md:text-lg text-grey2">
                  <Star className="w-5 h-5 mr-2 text-yellow-500 fill-current" />
                  <span className="font-medium">{book.rating}/10</span>
                </div>
              )}
            </div>
          )}
        </div>
      </button>
    </motion.div>
  );
}

export function SortableBookCard({
  book,
  isSearch = false,
  handleClick,
  placeholder = false,
}: BaseCardProps & { placeholder?: boolean }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: book.id,
    data: { type: "book", book },
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    touchAction: "manipulation",
    zIndex: isDragging ? 10 : undefined,
  };

  const handleWrapperClick = (e: React.MouseEvent) => {
    // Suppress click that ends a drag (activation constraint may still emit click)
    if (isDragging) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClickCapture={handleWrapperClick}
      className={`h-full cursor-grab active:cursor-grabbing outline-none rounded-lg ${
        isDragging ? "ring-2 ring-primary" : ""
      } ${placeholder ? "hidden" : ""}`}
    >
      <BaseCard book={book} isSearch={isSearch} handleClick={handleClick} />
    </div>
  );
}

export default function Card(props: CardProps) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/book/${props.book.book_id}`);
  };

  // Search results are never sortable
  if (props.isSearch || props.isDraggable === false) {
    return (
      <BaseCard
        book={props.book}
        isSearch={props.isSearch}
        handleClick={handleClick}
      />
    );
  }

  return (
    <SortableBookCard
      book={props.book}
      isSearch={props.isSearch}
      handleClick={handleClick}
      placeholder={props.placeholder}
    />
  );
}
