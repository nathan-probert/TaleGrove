"use client";

import { Book } from '@/types';
import { motion } from 'framer-motion';
import { BookOpen, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDrag, useDrop } from 'react-dnd';
import { reorderBookInFolder } from '@/lib/supabase';
import { ComponentType } from 'react';

interface CardProps {
  book: Book;
  folderId?: string | null;
  parentFolderId?: string | null;
  refresh?: () => void;
  isDraggable?: boolean;
  isSearch?: boolean;
}

interface DnDWrapperProps {
  book: Book;
  effectiveFolderId?: string | null;
  refresh?: () => void;
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
      type: 'book',
      item: { 
        id: props.book.id, 
        folderId: props.effectiveFolderId, 
        info: props.book 
      },
      collect: (monitor) => ({
        isDragging: !!monitor.isDragging(),
      }),
    }));

    const [{ isOver }, drop] = useDrop({
      accept: 'book',
      drop: (draggedItem: DraggedItemType) => {
        if (draggedItem.id !== props.book.id && 
            draggedItem.folderId === props.effectiveFolderId) {
          reorderBookInFolder(
            draggedItem.id,
            props.book.id,
            props.effectiveFolderId,
            props.book.user_id
          ).then(() => {
            props.refresh?.();
          });
        }
      },
      collect: monitor => ({
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
          backgroundColor: isOver ? 'var(--grey5)' : 'transparent'
        }}
      >
        <Component {...props} />
      </div>
    );
  };

  WrappedComponent.displayName = `WithDnD(${Component.displayName || Component.name || 'Component'})`;
  return WrappedComponent;
};

function BaseCard({
  book,
  isSearch = false,
  handleClick
}: BaseCardProps) {
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
            <img
              src={book.cover_url}
              alt={book.title}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <BookOpen className="w-12 h-12 text-grey3" />
            </div>
          )}
        </div>

        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-1 line-clamp-2 group-hover:text-primary transition-colors">
            {book.title}
          </h3>
          <p className="text-sm text-grey2 line-clamp-1">
            {book.author || 'Unknown Author'}
          </p>

          {!isSearch && (
            <div className="flex items-center gap-2 mt-3">
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                book.status === "completed" ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
              }`}>
                {book.status}
              </span>
              {book.rating && (
                <div className="flex items-center text-sm text-grey2">
                  <Star className="w-4 h-4 mr-1 text-yellow-500 fill-current" />
                  <span>{book.rating}/10</span>
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
  const effectiveFolderId = props.folderId === '__go_up__' ? props.parentFolderId : props.folderId;
  
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