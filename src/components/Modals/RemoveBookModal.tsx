import { BaseModal } from "./BaseModal";
import { FolderIcon } from "lucide-react"; // Assuming you have this icon

interface RemoveBookModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    book: { title: string };
    folders: Array<{ id: string; name: string }>;
    selectedFolderIds: string[];
    handleFolderSelectionChange: (folderId: string, checked: boolean) => void;
    isRemoving: boolean;
}

export const RemoveBookModal = ({
    isOpen,
    onClose,
    onConfirm,
    book,
    folders,
    selectedFolderIds,
    handleFolderSelectionChange,
    isRemoving,
}: RemoveBookModalProps) => (
    <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title={`Remove "${book.title}"`}
        confirmButtonText="Confirm Removal"
        onConfirm={onConfirm}
        isLoading={isRemoving}
        loadingText="Removing..."
        disabled={isRemoving || (folders.length > 0 && selectedFolderIds.length === 0)}
        variant="destructive"
        footerContent={
            <>
                {folders.length > 0 && selectedFolderIds.length === 0 && (
                    <p className="text-xs text-red-500 mt-2 text-right">
                        Select at least one folder to remove from, or cancel.
                    </p>
                )}
                {folders.length === 0 && (
                    <p className="text-xs text-grey2 mt-2 text-right">
                        Confirming will remove the book entirely.
                    </p>
                )}
            </>
        }
    >
        <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
            {folders.map((folder) => (
                <label
                    key={folder.id}
                    className="flex items-center p-3 rounded-lg hover:bg-grey5 transition-colors cursor-pointer"
                >
                    <input
                        type="checkbox"
                        checked={selectedFolderIds.includes(folder.id)}
                        onChange={(e) => handleFolderSelectionChange(folder.id, e.target.checked)}
                        className="w-4 h-4 text-primary rounded border-grey4 focus:ring-primary"
                    />
                    <FolderIcon className="w-5 h-5 text-yellow-500 mx-3" />
                    <span className="text-foreground">{folder.name}</span>
                </label>
            ))}
        </div>
    </BaseModal>
);