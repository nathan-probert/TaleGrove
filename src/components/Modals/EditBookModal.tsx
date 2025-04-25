import { BaseModal } from "./BaseModal";
import { BookStatus } from "@/types";
import { useState } from "react";
import { Info } from "lucide-react";

interface EditBookModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    statusOptions: Array<{ value: string; label: string }>;
    editedStatus: string;
    handleStatusChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    editedRating: number | null;
    setEditedRating: (rating: number | null) => void;
    editedNotes: string;
    setEditedNotes: (notes: string) => void;
    isUpdating: boolean;
    editedDateRead: string;
    setEditedDateRead: (date: string) => void;
}

export const EditBookModal = ({
    isOpen,
    onClose,
    onConfirm,
    statusOptions,
    editedStatus,
    handleStatusChange,
    editedRating,
    setEditedRating,
    editedNotes,
    setEditedNotes,
    isUpdating,
    editedDateRead,
    setEditedDateRead,
}: EditBookModalProps) => {
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
            title="Edit Details"
            confirmButtonText="Save Changes"
            onConfirm={onConfirm}
            isLoading={isUpdating}
            loadingText="Saving..."
            disabled={isUpdating}
        >
            <div className="mb-4">
                <p className="text-sm font-medium text-foreground mb-2">Status:</p>
                <div className="flex gap-4">
                    {statusOptions.map((option) => (
                        <label key={option.value} className="flex items-center gap-2">
                            <input
                                type="radio"
                                value={option.value}
                                checked={editedStatus === option.value}
                                onChange={handleStatusChange}
                                className="w-4 h-4 text-primary"
                            />
                            <span className="text-foreground">{option.label}</span>
                        </label>
                    ))}
                </div>
            </div>

            {editedStatus === BookStatus.completed && (
                <div className="space-y-4">
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
                                value={editedDateRead}
                                onChange={(e) => {
                                if (validateDate(e.target.value)) {
                                    setEditedDateRead(e.target.value);
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
                            Your Rating: {editedRating || 0}/10
                        </label>
                        <div className="flex items-center gap-4">
                            <input
                                type="range"
                                min="1"
                                max="10"
                                value={editedRating || 0}
                                onChange={(e) => {
                                    const value = Number(e.target.value);
                                    setEditedRating(value);
                                }}
                                className="slider-thumb"
                                style={{
                                    '--fill-percent': `${((Number(editedRating || 1) - 1) / 9 * 100)}%`
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
                            value={editedNotes}
                            onChange={(e) => setEditedNotes(e.target.value)}
                            className="w-full p-2 border-2 border-gray-200 rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all bg-background text-sm text-foreground"
                            rows={3}
                            placeholder="Write your thoughts about this book..."
                        />
                    </div>
                </div>
            )}
        </BaseModal>
    );
};