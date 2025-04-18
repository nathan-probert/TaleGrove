'use client';

import { Book } from '@/types';
import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SearchBookCard({ book }: { book: Book }) {
  const router = useRouter();

  const handleClick = () => {
    router.push(`/book/${book.book_id}`);
  };

  return (
    <motion.li
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.2 }}
    >
      <button
        onClick={handleClick}
        className="cursor-pointer w-full text-left group flex flex-col h-full rounded-lg bg-card text-card-foreground shadow-sm border border-border overflow-hidden transition-transform hover:scale-[1.015]"
      >
        {/* Cover */}
        <div className="w-full bg-muted aspect-[2/3] overflow-hidden relative flex items-center justify-center">
          {book.cover_url ? (
            <img
              src={book.cover_url}
              alt={book.title}
              className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <BookOpen className="w-12 h-12 opacity-50" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 flex flex-col flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-1 line-clamp-2 leading-tight group-hover:text-primary transition-colors">
            {book.title}
          </h3>
          <p className="text-sm text-muted-foreground font-medium line-clamp-1">
            {book.author || 'Unknown Author'}
          </p>
        </div>
      </button>
    </motion.li>
  );
}
