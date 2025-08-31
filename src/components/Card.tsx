"use client";

import { Book } from "@/types";
import { motion } from "framer-motion";
import Image from "next/image";
import { BookOpen, Star } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDrag, useDrop } from "react-dnd";
import { reorderBookInFolder } from "@/lib/supabase";
import { ComponentType } from "react";

interface CardProps {
  book: Book;
  folderId?: string | null;
  parentFolderId?: string | null;
  refresh?: (hideId?: string) => void;
  isDraggable?: boolean;
  isSearch?: boolean;
}

interface DnDWrapperProps {
  book: Book;
  effectiveFolderId?: string | null;
  refresh?: (hideId?: string) => void;
  handleClick: () => void;
  isSearch?: boolean;
}

interface BaseCardProps {
  book: Book;
  isSearch?: boolean;
  handleClick: () => void;
}

type DraggedItemType = {
  id: string;
  folderId: string | null;
  info: Book;
};

const WithDnD = (Component: ComponentType<DnDWrapperProps>) => {
  const WrappedComponent = (props: DnDWrapperProps) => {
    const [{ isDragging }, drag] = useDrag(() => ({
      type: "book",
      item: {
        id: props.book.id,
        folderId: props.effectiveFolderId,
        info: props.book,
      },
      collect: (monitor) => ({
        isDragging: !!monitor.isDragging(),
      }),
    }));

    const [{ isOver }, drop] = useDrop({
      accept: "book",
      drop: (draggedItem: DraggedItemType) => {
        if (
          draggedItem.id !== props.book.id &&
          draggedItem.folderId === props.effectiveFolderId
        ) {
          reorderBookInFolder(
            draggedItem.id,
            props.book.id,
            props.effectiveFolderId,
            props.book.user_id,
          ).then(() => {
            props.refresh?.(draggedItem.id);
          });
        }
      },
      collect: (monitor) => ({
        isOver: monitor.isOver(),
      }),
    });

    return (
      <div
        ref={(node) => {
          drag(node);
          drop(node);
        }}
        style={{
          opacity: isDragging ? 0.5 : 1,
          backgroundColor: isOver ? "var(--grey5)" : "transparent",
        }}
      >
        <Component {...props} />
      </div>
    );
  };

  WrappedComponent.displayName = `WithDnD(${Component.displayName || Component.name || "Component"})`;
  return WrappedComponent;
};

function BaseCard({ book, isSearch = false, handleClick }: BaseCardProps) {
  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
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
    </motion.li>
  );
}

const DnDCard = WithDnD(BaseCard);

export default function Card(props: CardProps) {
  const router = useRouter();
  const effectiveFolderId =
    props.folderId === "__go_up__" ? props.parentFolderId : props.folderId;

  const handleClick = () => {
    router.push(`/book/${props.book.book_id}`);
  };

  return props.isDraggable ? (
    <DnDCard
      book={props.book}
      effectiveFolderId={effectiveFolderId}
      refresh={props.refresh}
      handleClick={handleClick}
      isSearch={props.isSearch}
    />
  ) : (
    <BaseCard
      book={props.book}
      isSearch={props.isSearch}
      handleClick={handleClick}
    />
  );
}
