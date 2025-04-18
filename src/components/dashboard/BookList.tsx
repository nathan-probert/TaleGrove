import { Book } from '@/types';
import BookCard from './BookCard';
import { motion } from 'framer-motion';
import Link from 'next/link';

type Props = {
  books: Book[];
  onDelete: (id: string) => void;
};

const gridVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

export default function BookList({ books, onDelete }: Props) {
  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <p className="text-xl text-gray-500 mb-4">
          Looks like your bookshelf is feeling a bit lonely!
        </p>
        <Link
          href="/search"
          className="text-blue-500 hover:text-blue-700 underline"
        >
          Why not find some new friends for it?
        </Link>
      </div>
    );
  }

  return (
    <motion.ul
      variants={gridVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-[repeat(auto-fill,minmax(18rem,1fr))] gap-8 p-6"
      style={{ gap: '25px' }}>

      {books.map((book) => (
        <BookCard key={book.id} book={book} onDelete={onDelete} />
      ))}
    </motion.ul>
  );
}