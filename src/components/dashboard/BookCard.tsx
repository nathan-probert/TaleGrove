"use client";


import { Book } from '@/types';
import { motion } from 'framer-motion';
import { BookOpen, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDrag } from 'react-dnd';

export default function BookCard({ book, folderId, parentFolderId, refresh }: { book: Book, folderId: string | null, parentFolderId: string | null, refresh: () => void }) {

    const effectiveFolderId = folderId === '__go_up__' ? parentFolderId : folderId;

    const [{ isDragging }, drag] = useDrag(() => ({
        type: 'item',
        // Use effectiveFolderId for the folderId property in the item payload.
        // parentFolderId is omitted based on the "only pass one" requirement.
        item: { id: book.id, folderId: effectiveFolderId, type: 'book', info: book },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));

    const router = useRouter();

    const handleClick = () => {
        router.push(`/book/${book.book_id}`);
    };

    return (
        <motion.li
            ref={(node) => {
                drag(node);
            }}
            style={{ opacity: isDragging ? 0.5 : 1 }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
            className="group relative flex flex-col h-full rounded-lg bg-background shadow-sm hover:shadow-md transition-shadow"
        >
            <button
                onClick={handleClick}
                className="cursor-pointer w-full text-left group flex flex-col h-full p-4 relative"
            >
                {/* Book-inspired container */}
                <div className="relative">
                    {/* Main Card - Changed aspect ratio */}
                    <div className="w-full bg-grey4/20 rounded-lg overflow-hidden aspect-[2/3] mb-4 border border-grey4">
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
                </div>

                {/* Content */}
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground mb-1 line-clamp-2">
                        {book.title}
                    </h3>
                    <p className="text-sm text-grey2 line-clamp-1">{book.author || 'Unknown Author'}</p>

                    {/* Status & Rating */}
                    <div className="flex items-center gap-2 mt-3">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${book.status === "completed"
                            ? 'bg-green-100 text-green-800'
                            : 'bg-blue-100 text-blue-800'
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
                </div>
            </button>
        </motion.li>
    );
}
