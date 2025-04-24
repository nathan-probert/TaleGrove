import { BaseModal } from "./BaseModal";
import { BookStatus } from "@/types";

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
}: EditBookModalProps) => (
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
        {/* Status radio buttons */}
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

        {/* Rating and Notes inputs */}
        {editedStatus === BookStatus.completed && (
            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Rating (1-10)
                    </label>
                    <input
                        type="number"
                        min="1"
                        max="10"
                        value={editedRating || ""}
                        onChange={(e) => setEditedRating(e.target.value ? parseInt(e.target.value) : null)}
                        className="w-full p-2 border rounded-lg"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                        Notes
                    </label>
                    <textarea
                        value={editedNotes}
                        onChange={(e) => setEditedNotes(e.target.value)}
                        className="w-full p-2 border rounded-lg h-32"
                    />
                </div>
            </div>
        )}
    </BaseModal>
);