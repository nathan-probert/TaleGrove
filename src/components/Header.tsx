"use client";

import Link from "next/link";
import { Book, Search, Lightbulb } from "lucide-react";

export default function Header() {
    return (
        <header className="bg-background shadow p-4 mb-6">
            <h1 className="text-2xl font-bold text-center">📚 TaleGrove</h1>
            <nav className="flex justify-center mt-4">
                <Link
                    href="/books"
                    className="mx-2 p-2 rounded-full hover:bg-muted transition-colors"
                >
                    <Book size={24} />
                </Link>
                <Link
                    href="/search"
                    className="mx-2 p-2 rounded-full hover:bg-muted transition-colors"
                >
                    <Search size={24} />
                </Link>
                <Link
                    href="/discover"
                    className="mx-2 p-2 rounded-full hover:bg-muted transition-colors"
                >
                    <Lightbulb size={24} />
                </Link>
            </nav>
        </header>
    );
}