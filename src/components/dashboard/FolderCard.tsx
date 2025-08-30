"use client";

import { Book, Folder } from '@/types';
import { motion } from 'framer-motion';
import { Book as BookIcon, FolderIcon, ArrowLeftIcon } from 'lucide-react'; // Renamed Book icon import
import { useDrag, useDrop } from 'react-dnd';
import { addBookToFolder, addFolderToFolder, getBooksInFolder } from '@/lib/supabase';
import { useEffect, useState } from 'react';

interface FolderCardProps {
  folder: Folder;
  onFolderClick?: (folderId: string, name: string) => void;
  onRefresh?: (hideId?: string) => void;
}


export default function FolderCard({ folder, onFolderClick, onRefresh }: FolderCardProps) {
  const [books, setBooks] = useState<Book[]>([]);

  useEffect(() => {
    // Only fetch books if it's not the 'back' folder representation
    if (folder.parent_id !== null) {
      getBooksInFolder(folder.id, folder.user_id).then((books) => {
        setBooks(books);
      });
    }
  }, [folder.id, folder.user_id, folder.parent_id]);

  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'folder',
    item: { id: folder.id, user_id: folder.user_id, info: folder },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const [{ isOver }, drop] = useDrop(() => ({
    accept: ['book', 'folder'],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  drop: (item: any, monitor) => { // Use 'any' or a more specific union type for item
      const itemType = monitor.getItemType();
      const draggedItemUserId = item.info?.user_id ?? item.user_id; // Handle potential differences in item structure

      if (!draggedItemUserId) {
        console.error("User ID is undefined, cannot perform drop operation.");
        return;
      }

      if (itemType === 'book') {
        // Ensure item.id and item.folderId are correctly passed for books
        const bookId = item.id;
        const sourceFolderId = item.folderId; // Assuming folderId is part of the book item
        addBookToFolder(bookId, sourceFolderId, folder.id, draggedItemUserId).then(() => {
          // Inform parent to hide the dragged item while refreshing
          onRefresh?.(bookId);
        });
      } else if (itemType === 'folder') {
        // Ensure item.id is correctly passed for folders
        const folderId = item.id;
        addFolderToFolder(folderId, folder.id, draggedItemUserId).then(() => {
          onRefresh?.(folderId);
        });
      }
    },
    collect: (monitor) => ({
      isOver: !!monitor.isOver(),
    }),
  }));

  const handleClick = () => {
    if (onFolderClick) {
      onFolderClick(folder.id, folder.name);
    }
  };

  // Determine grid class based on the number of books
  const getGridClass = (count: number) => {
    if (count === 1) return "grid grid-cols-1 grid-rows-1";
    if (count === 2) return "grid grid-cols-2 grid-rows-1";
    if (count === 3) return "grid grid-cols-2 grid-rows-2 [&>*:nth-child(3)]:col-span-2 [&>*:nth-child(3)]:w-1/2 [&>*:nth-child(3)]:justify-self-center";
    return "grid grid-cols-2 grid-rows-2";
  };

  const booksToDisplay = books.slice(0, 4);
  const gridClass = getGridClass(booksToDisplay.length);

  return (
    <motion.li
      ref={(node) => {
        drag(node);
        drop(node);
      }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onClick={handleClick}
      className="group relative flex flex-col h-full rounded-lg bg-background shadow-sm border border-primary overflow-hidden hover:shadow-md transition-shadow cursor-pointer" // Added cursor-pointer here
      style={{
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: isOver ? 'var(--grey5)' : 'var(--background)'
      }}
    >
      <div className="w-full text-left group flex flex-col h-full p-4">
        {/* Visual Representation Area */}
        <div className={`w-full bg-grey4/20 rounded-lg overflow-hidden relative aspect-square mb-4 ${booksToDisplay.length > 0 ? gridClass : 'flex items-center justify-center'}`}>
          {booksToDisplay.length === 0 ? (
            folder.parent_id === null ? (
              <ArrowLeftIcon className="w-24 h-24 sm:w-36 sm:h-36 text-primary" />
            ) : (
              <FolderIcon className="w-24 h-24 sm:w-36 sm:h-36 text-primary" />
            )
          ) : (
            <>
              {booksToDisplay.map((book, index) => (
                <div key={book.id || index} className="w-full h-full overflow-hidden">
                  {book.cover_url ? (
                    <img
                      src={book.cover_url}
                      alt={book.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full bg-grey3 flex items-center justify-center">
                      <BookIcon className="w-6 h-6 text-grey1" />
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Folder Name */}
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-foreground line-clamp-2">{folder.name}</h3>
          <p className="text-sm text-muted-foreground line-clamp-2">Folder</p>
        </div>
      </div>
    </motion.li>
  );
}