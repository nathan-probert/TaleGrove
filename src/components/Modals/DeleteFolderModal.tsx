import { useEffect, useState } from "react";
import { BaseModal } from "./BaseModal";

export type DeleteFolderMode = "move" | "delete";

interface DeleteFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (mode: DeleteFolderMode) => void;
  folderName: string;
  parentName: string;
  bookCount: number;
  subfolderCount: number;
  countsLoading?: boolean;
  isLoading?: boolean;
  error?: string | null;
}

export const DeleteFolderModal = ({
  isOpen,
  onClose,
  onConfirm,
  folderName,
  parentName,
  bookCount,
  subfolderCount,
  countsLoading = false,
  isLoading = false,
  error = null,
}: DeleteFolderModalProps) => {
  const [mode, setMode] = useState<DeleteFolderMode>("move");
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMode("move");
      setAcknowledged(false);
    }
  }, [isOpen]);

  const isEmpty = bookCount === 0 && subfolderCount === 0;
  const deleteBlocked = mode === "delete" && !acknowledged;

  const handleConfirm = () => {
    if (mode === "delete" && !acknowledged) return;
    onConfirm(mode);
  };

  const confirmLabel =
    mode === "move" ? "Move & Delete Folder" : "Delete Everything";

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Delete "${folderName}"?`}
      confirmButtonText={confirmLabel}
      onConfirm={handleConfirm}
      isLoading={isLoading}
      loadingText="Deleting..."
      disabled={isLoading || countsLoading || deleteBlocked}
      footerContent={
        <>
          {mode === "delete" && !acknowledged && (
            <p className="text-xs text-red-500 mt-2 text-right">
              Please check the acknowledgement box to enable deletion.
            </p>
          )}
          {error && (
            <p role="alert" className="text-xs text-red-500 mt-2 text-right">
              {error}
            </p>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm text-foreground">
          {countsLoading ? (
            "Loading folder contents…"
          ) : isEmpty ? (
            <>
              <span className="font-medium">{folderName}</span> is empty. It
              can be deleted safely.
            </>
          ) : (
            <>
              <span className="font-medium">{folderName}</span> contains{" "}
              <span className="font-medium">
                {bookCount} book{bookCount === 1 ? "" : "s"}
              </span>{" "}
              and{" "}
              <span className="font-medium">
                {subfolderCount} subfolder{subfolderCount === 1 ? "" : "s"}
              </span>{" "}
              directly. Choose what to do with them:
            </>
          )}
        </p>

        <div className="space-y-2" role="radiogroup" aria-label="Delete options">
          <label
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              mode === "move"
                ? "border-primary bg-primary/5"
                : "border-grey4 hover:bg-grey5"
            }`}
          >
            <input
              type="radio"
              name="delete-folder-mode"
              value="move"
              checked={mode === "move"}
              onChange={() => setMode("move")}
              disabled={isLoading}
              className="mt-1 w-4 h-4 text-primary border-grey4 focus:ring-primary"
            />
            <span>
              <span className="block text-sm font-medium text-foreground">
                Move contents to parent folder
              </span>
              <span className="block text-xs text-grey2 mt-0.5">
                Books re-link to &ldquo;{parentName}&rdquo; (kept if already
                shelved elsewhere); subfolders re-parent there. Recommended.
              </span>
            </span>
          </label>

          <label
            className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
              mode === "delete"
                ? "border-red-500 bg-red-500/5"
                : "border-grey4 hover:bg-grey5"
            }`}
          >
            <input
              type="radio"
              name="delete-folder-mode"
              value="delete"
              checked={mode === "delete"}
              onChange={() => setMode("delete")}
              disabled={isLoading}
              className="mt-1 w-4 h-4 text-red-600 border-grey4 focus:ring-red-500"
            />
            <span className="flex-1">
              <span className="block text-sm font-medium text-foreground">
                Delete everything inside too
              </span>
              <span className="block text-xs text-grey2 mt-0.5">
                Removes this folder, its subfolders, and books shelved nowhere
                else. Books still shelved in other folders are kept. This
                cannot be undone.
              </span>
              {mode === "delete" && (
                <label
                  className="mt-2 flex items-start gap-2 cursor-pointer"
                  onClick={(e) => e.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                    disabled={isLoading}
                    className="mt-0.5 w-4 h-4 text-red-600 rounded border-grey4 focus:ring-red-500"
                    aria-label="Acknowledge permanent deletion"
                  />
                  <span className="text-xs text-foreground">
                    I understand this permanently deletes the folder and any
                    books shelved nowhere else.
                  </span>
                </label>
              )}
            </span>
          </label>
        </div>
      </div>
    </BaseModal>
  );
};
