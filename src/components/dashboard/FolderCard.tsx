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
  refresh: () => void;
}


export default function FolderCard({ folder, onFolderClick, refresh }: FolderCardProps) {
  const [books, setBooks] = useState<Book[]>([]);


  useEffect(() => {
    if (folder.parent_id === null) {
      return;
    }

    getBooksInFolder(folder.id, folder.user_id).then((books) => {
      setBooks(books);
    });
  });

  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'folder',
    item: { id: folder.id, user_id: folder.user_id, info: folder },
    collect: (monitor) => ({
      isDragging: !!monitor.isDragging(),
    }),
  }));

  const [{ isOver }, drop] = useDrop(() => ({
    accept: ['book', 'folder'],
    drop: (item: { id: string; folderId: string, info: Book }, monitor) => {
      const itemType = monitor.getItemType();
      if (itemType === 'book') {
        if (item.info.user_id) {
          addBookToFolder(item.id, item.folderId, folder.id, item.info.user_id).then(() => {
            refresh();
          })
        } else {
          console.error("User ID is undefined, cannot add book to folder.");
        }
      } else if (itemType === 'folder') {
        if (item.info.user_id) {
          addFolderToFolder(item.id, folder.id, item.info.user_id).then(() => {
            refresh();
          })
        } else {
          console.error("User ID is undefined, cannot add folder to folder.");
        }
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
      className="group relative flex flex-col h-full rounded-lg bg-background shadow-sm border border-primary overflow-hidden hover:shadow-md transition-shadow"
      style={{
        opacity: isDragging ? 0.5 : 1,
        backgroundColor: isOver ? 'var(--grey5)' : 'var(--background)'
      }}
    >
      <div className="cursor-pointer w-full text-left group flex flex-col h-full p-4">
        {books.length === 0 ? (
          <div className="w-full bg-grey4/20 rounded-lg overflow-hidden relative flex items-center justify-center aspect-square mb-4">
            {folder.parent_id === null ? (
              <ArrowLeftIcon className="w-36 h-36 text-primary" />
            ) : (
              <FolderIcon className="w-36 h-36 text-primary" />
            )}
          </div>
        ) : (
          <div className="w-full bg-grey4/20 rounded-lg overflow-hidden relative grid grid-cols-2 grid-rows-2 aspect-square mb-4">
            {books.slice(0, 4).map((book, index) => (
              <div key={book.id || index} className="w-full h-full overflow-hidden">
                {book.cover_url ? (
                  <img
                    src={book.cover_url}
                    alt={book.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-grey3 flex items-center justify-center">
                    {/* Placeholder for books without covers */}
                    <BookIcon className="w-6 h-6 text-grey1" />
                  </div>
                )}
              </div>
            ))}
            {/* Fill remaining grid cells if less than 4 books */}
            {Array.from({ length: Math.max(0, 4 - books.length) }).map((_, index) => (
              <div key={`placeholder-${index}`} className="w-full h-full bg-grey4/10"></div>
            ))}
          </div>
        )}
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground line-clamp-2">{folder.name}</h3>
        </div>
      </div>
    </motion.li>
  );
}