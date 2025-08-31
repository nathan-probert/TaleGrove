"use client";

import { Book } from "@/types";
import Card from "../Card";

export default function SearchBookCard({ book }: { book: Book }) {
  return <Card book={book} isSearch />;
}
