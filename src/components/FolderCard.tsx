"use client";

import { Book, Folder } from '@/types';
import { motion } from 'framer-motion';
import { FolderIcon } from 'lucide-react';
import { useDrag, useDrop } from 'react-dnd';
import { addBookToFolder } from '@/lib/supabase';

interface FolderCardProps {
    folder: Folder;
    onFolderClick?: (folderId: string, name: string) => void;
    refresh: () => void;
}

export default function FolderCard({ folder, onFolderClick, refresh }: FolderCardProps) {
    const [{ isDragging }, drag] = useDrag(() => ({
        type: 'item',
        item: { id: folder.id, type: 'folder' },
        collect: (monitor) => ({
            isDragging: !!monitor.isDragging(),
        }),
    }));

    const [{ isOver }, drop] = useDrop(() => ({
        accept: 'item',
        drop: (item: { id: string; folderId: string, type: string, info: Book }) => {
            console.log('Dropped item:', item);
            if (item.info.user_id) {
                addBookToFolder(item.id, item.folderId, folder.id, item.info.user_id).then(() => {
                    if (typeof refresh === 'function') {
                        refresh();
                    } else {
                        console.warn('refresh is not a function', refresh);
                    }
                })
            } else {
                console.error("User ID is undefined, cannot add book to folder.");
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
            className="group relative flex flex-col h-full rounded-lg bg-card shadow-sm border border-border overflow-hidden"
            style={{
                opacity: isDragging ? 0.5 : 1,
                backgroundColor: isOver ? '#f0f0f0' : 'white'
            }}
            onClick={handleClick}
        >
            <div className="cursor-pointer w-full text-left group flex flex-col h-full">
                <div className="w-full bg-muted overflow-hidden relative flex items-center justify-center h-48">
                    <FolderIcon className="w-16 h-16 text-yellow-500" />
                </div>
                <div className="p-4">
                    <h3 className="text-lg font-semibold line-clamp-2">{folder.name}</h3>
                </div>
            </div>
        </motion.li>
    );
}