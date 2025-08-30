import { BaseModal } from "./BaseModal";
import { Info, Search } from "lucide-react";
import { BookStatus } from "@/types";
import { useState } from "react";

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
    dateRead: string;
    setDateRead: (date: string) => void;
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
    dateRead,
    setDateRead,
}: AddBookModalProps) => {
    const [dateError, setDateError] = useState<string | null>(null);

    const validateDate = (date: string) => {
        const selectedDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (selectedDate > today) {
            setDateError("Date cannot be in the future");
            return false;
        }
        setDateError(null);
        return true;
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={book.title}
            confirmButtonText="Add Now"
            onConfirm={onConfirm}
            isLoading={isAdding}
            loadingText="Adding..."
            disabled={isAdding || selectedFolderIds.length === 0}
        >
            <div className="max-h-[70vh] overflow-hidden space-y-6 pr-4 pl-1">
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
                    <div className="max-h-48 overflow-y-auto space-y-2 pr-2">
                        {folders.map((folder) => (
                            <label
                                key={folder.id}
                                className="flex items-center gap-4 p-3 hover:bg-grey3 rounded-lg cursor-pointer "
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
                        {/* Date Finished Input */}
                        <div>
                            <div className="flex items-center gap-2">
                                <label className="block text-sm font-medium text-foreground mb-2">
                                    Date Read
                                </label>
                                <div className="group relative inline-block">
                                    <Info className="mb-2 w-4 h-4 text-gray-400 hover:text-gray-500 cursor-help align-middle" />
                                    <div className="hidden group-hover:block absolute bottom-full left-7/8 mb-2 px-3 py-2 text-sm text-gray-700 bg-white border border-gray-200 rounded-lg shadow-lg w-48 text-center z-10">
                                        The more accurate your information, the better our recommendations!
                                    </div>
                                </div>

                            </div>
                            <div className="relative w-full">
                            <div className="relative w-full">
                                <input
                                    type="date"
                                    value={dateRead}
                                    onChange={(e) => {
                                    if (validateDate(e.target.value)) {
                                        setDateRead(String(e.target.value));
                                    }
                                    }}
                                    max={new Date().toISOString().split('T')[0]}
                                    className="bg-background w-full p-2 pr-10 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all text-sm custom-date-input"
                                    required
                                />
                                {/* Your custom calendar icon */}
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-emerald-500 pointer-events-none"
                                    width="20"
                                    height="20"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M7 10h5v5H7z" opacity=".3"></path>
                                    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 
                                    1.1.9 2 2 2h14c1.1 0 2-.9 
                                    2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM5 
                                    7V6h14v1H5z"></path>
                                </svg>
                                </div>
                            </div>

                            {dateError && (
                                <p className="text-red-500 text-sm mt-1">{dateError}</p>
                            )}
                        </div>

                        {/* Rating Input */}
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

                        {/* Notes Input */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-2">
                                Personal Notes
                            </label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                className="w-full p-2 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all bg-background text-sm text-foreground"
                                rows={3}
                                placeholder="Write your thoughts about this book..."
                            />
                        </div>
                    </div>
                )}
            </div>
        </BaseModal>
    );
};