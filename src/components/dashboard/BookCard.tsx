"use client";


import { Book } from '@/types';
import { motion } from 'framer-motion';
import { BookOpen, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useDrag } from 'react-dnd';

export default function BookCard({ book, folderId, parentFolderId, refresh }: { book: Book, folderId: string | null, parentFolderId: string | null, refresh: () => void }) {
    console.log('Folder ID in BookCard:', folderId);

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
            className="group relative flex flex-col h-full rounded-lg bg-card text-card-foreground shadow-sm border border-border overflow-hidden"
        >
            <button
                onClick={handleClick}
                className="cursor-pointer w-full text-left group flex flex-col h-full rounded-lg bg-card text-card-foreground shadow-sm border border-border overflow-hidden transition-transform hover:scale-[1.015]"
            >
                {/* Cover Image */}
                <div className="w-full bg-muted overflow-hidden relative flex items-center justify-center"> {/* Added flex centering for object-contain */}
                    {book.cover_url ? (
                        <img
                            src={book.cover_url}
                            alt={book.title}
                            className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-105" // Changed object-cover to object-contain
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
                    <p className="text-sm text-muted-foreground mb-3 font-medium line-clamp-1">{book.author || 'Unknown Author'}</p>

                    {/* Status & Rating */}
                    <div className="flex items-center gap-3 mb-4 text-xs">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-medium ${book.completed
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
                            }`}>
                            {book.completed ? 'Rating: ' : 'Reading...'}
                        </span>
                        {book.rating && (
                            <div className="flex items-center text-muted-foreground">
                                <Star className="w-3.5 h-3.5 mr-1 text-yellow-500 fill-current" />
                                <span className="font-medium">
                                    {book.rating}/10
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Notes Preview */}
                    {book.notes && (
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-4 italic border-l-2 border-border pl-2">
                            {book.notes}
                        </p>
                    )}
                </div>
            </button>
        </motion.li>
    );
}
