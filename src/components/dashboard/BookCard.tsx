"use client";


import { Book } from '@/types';
import Card from '../Card';

export default function BookCard({ book, folderId, parentFolderId, refresh }: { book: Book, folderId: string | null, parentFolderId: string | null, refresh: () => void }) {
    return (
        <Card 
        book={book}
        folderId={folderId}
        parentFolderId={parentFolderId}
        refresh={refresh}
        isDraggable
        />
    );
}
