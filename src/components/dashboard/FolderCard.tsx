"use client";

import { Book, Folder } from '@/types';
import { motion } from 'framer-motion';
import { FolderIcon } from 'lucide-react';
import { useDrag, useDrop } from 'react-dnd';
import { addBookToFolder, addFolderToFolder } from '@/lib/supabase';

interface FolderCardProps {
    folder: Folder;
    onFolderClick?: (folderId: string, name: string) => void;
    refresh: () => void;
}

export default function FolderCard({ folder, onFolderClick, refresh }: FolderCardProps) {
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
                <div className="w-full bg-grey4/20 rounded-lg overflow-hidden relative flex items-center justify-center aspect-square mb-4">
                    <FolderIcon className="w-12 h-12 text-primary" />
                </div>
                <div className="flex-1">
                    <h3 className="text-lg font-semibold text-foreground line-clamp-2">{folder.name}</h3>
                    <p className="text-sm text-grey2 mt-1">Folder</p>
                </div>
            </div>
        </motion.li>
    );
}