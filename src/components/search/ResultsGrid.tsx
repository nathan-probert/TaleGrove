'use client';

import { motion } from 'framer-motion';
import { Book } from '@/types';
import SearchBookCard from '@/components/search/SearchBookCard';

const gridVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

type ResultsGridProps = {
  results: Book[];
};

export const ResultsGrid = ({ results }: ResultsGridProps) => (
  <motion.ul
    variants={gridVariants}
    initial="hidden"
    animate="show"
    className="grid grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] gap-6 p-6"
  >
    {results.map((book) => (
      <SearchBookCard key={book.id} book={book} />
    ))}
  </motion.ul>
);