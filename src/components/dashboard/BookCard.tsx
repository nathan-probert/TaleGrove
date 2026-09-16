"use client";

import { Book } from "@/types";
import Card from "../Card";

export default function BookCard({
  book,
  placeholder = false,
  sortable = true,
}: {
  book: Book;
  placeholder?: boolean;
  /** false renders a static card (used while searching). */
  sortable?: boolean;
}) {
  return <Card book={book} placeholder={placeholder} isDraggable={sortable} />;
}
