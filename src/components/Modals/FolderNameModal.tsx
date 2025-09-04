import { BaseModal } from "./BaseModal";
import { useState, useEffect } from "react";

interface FolderNameModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (name: string) => void;
    title: string;
    confirmButtonText: string;
    initialName?: string;
    isLoading?: boolean;
}

export const FolderNameModal = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    confirmButtonText,
    initialName = "",
    isLoading = false,
}: FolderNameModalProps) => {
    const [folderName, setFolderName] = useState(initialName);

    useEffect(() => {
        if (isOpen) {
            setFolderName(initialName);
        }
    }, [isOpen, initialName]);

    const handleConfirm = () => {
        if (folderName.trim()) {
            onConfirm(folderName.trim());
            setFolderName("");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && folderName.trim()) {
            handleConfirm();
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            confirmButtonText={confirmButtonText}
            onConfirm={handleConfirm}
            isLoading={isLoading}
            disabled={!folderName.trim()}
        >
            <div className="space-y-2">
                <label
                    htmlFor="folder-name"
                    className="block text-sm font-medium text-foreground"
                >
                    Folder Name
                </label>
                <input
                    id="folder-name"
                    type="text"
                    value={folderName}
                    onChange={(e) => setFolderName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full px-3 py-2 border border-grey4 rounded-md bg-background text-foreground placeholder-grey2 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter folder name"
                    autoFocus
                />
            </div>
        </BaseModal>
    );
};
