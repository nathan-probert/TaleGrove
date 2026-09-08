"use client";

import { Book } from "@/types";
import Card from "../Card";

export default function BookCard({
  book,
  placeholder = false,
}: {
  book: Book;
  placeholder?: boolean;
}) {
  return <Card book={book} placeholder={placeholder} />;
}
