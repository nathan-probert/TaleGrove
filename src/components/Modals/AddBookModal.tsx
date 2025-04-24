import { BaseModal } from "./BaseModal";
import { Search } from "lucide-react";
import { BookStatus } from "@/types";

interface AddBookModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    book: { title: string };
    selectedFolderIds: string[];
    selectedStatus: string;
    handleStatusChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleFolderSelectionChange: (folderId: string, checked: boolean) => void;
    folders: Array<{ id: string; name: string }>;
    rating?: number;
    setRating: (rating: number) => void;
    notes: string;
    setNotes: (notes: string) => void;
    isAdding: boolean;
    statusOptions: Array<{ value: string; label: string }>;
}

export const AddBookModal = ({
    isOpen,
    onClose,
    onConfirm,
    book,
    selectedFolderIds,
    selectedStatus,
    handleStatusChange,
    handleFolderSelectionChange,
    folders,
    rating,
    setRating,
    notes,
    setNotes,
    isAdding,
    statusOptions,
}: AddBookModalProps) => (
    <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title={book.title}
        confirmButtonText={
            selectedFolderIds.length > 0
                ? `Add Now (${selectedFolderIds.length} folder${selectedFolderIds.length > 1 ? "s" : ""})`
                : "Add Now"
        }
        onConfirm={onConfirm}
        isLoading={isAdding}
        loadingText="Adding..."
        disabled={isAdding}
    >
        {/* Added pr-4 for right padding */}
        <div className="max-h-[70vh] overflow-y-auto space-y-6 pr-4">
            {/* Status selection */}
            <div className="mb-4">
                <p className="text-sm font-medium text-foreground mb-2">Select Status:</p>
                <div className="flex space-x-4">
                    {statusOptions.map((option) => (
                        <div key={option.value} className="flex items-center">
                            <input
                                type="radio"
                                value={option.value}
                                checked={selectedStatus === option.value}
                                onChange={handleStatusChange}
                                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                            />
                            <label className="ml-2 block text-sm text-foreground">
                                {option.label}
                            </label>
                        </div>
                    ))}
                </div>
            </div>

            {/* Folder selection */}
            <div className="border-2 border-gray-100 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <p className="text-lg font-semibold text-foreground">Select Folders</p>
                    <Search className="w-5 h-5 text-foreground" />
                </div>
                {/* Adjusted inner padding if needed, or rely on outer padding */}
                <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                    {folders.map((folder) => (
                        <label
                            key={folder.id}
                            className="flex items-center gap-4 p-3 hover:bg-grey3 rounded-lg cursor-pointer transition-colors"
                        >
                            <input
                                type="checkbox"
                                checked={selectedFolderIds.includes(folder.id)}
                                onChange={(e) => handleFolderSelectionChange(folder.id, e.target.checked)}
                                className="h-5 w-5 text-emerald-600 border-2 border-gray-300 rounded-lg focus:ring-emerald-500"
                            />
                            <span className="text-foreground">{folder.name}</span>
                        </label>
                    ))}
                </div>
            </div>

            {selectedStatus === BookStatus.completed && (
                <div className="space-y-4 pb-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-3">
                            Your Rating: {rating || 0}/10
                        </label>
                        <div className="flex items-center gap-4">
                            <input
                                type="range"
                                min="1"
                                max="10"
                                value={rating || 1}
                                onChange={(e) => {
                                    const value = Number(e.target.value);
                                    setRating(value);
                                }}
                                className="slider-thumb"
                                style={{
                                    '--fill-percent': `${((Number(rating || 1) - 1) / 9 * 100)}%`
                                } as React.CSSProperties}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-foreground mb-2">
                            Personal Notes
                        </label>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="w-full p-2 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all text-sm"
                            rows={3}
                            placeholder="Write your thoughts about this book..."
                        />
                    </div>
                </div>
            )}
        </div>
    </BaseModal>
);
