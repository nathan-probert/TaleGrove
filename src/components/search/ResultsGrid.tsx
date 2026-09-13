"use client";

import { motion } from "framer-motion";
import { Book } from "@/types";
import SearchBookCard from "@/components/search/SearchBookCard";

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
    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 2xl:grid-cols-8 gap-3"
  >
    {results.map((book) => (
      <SearchBookCard key={book.id} book={book} />
    ))}
  </motion.ul>
);
