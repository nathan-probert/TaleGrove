import { Loader2 } from "lucide-react";
import { ReactNode, MouseEvent } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  confirmButtonText: ReactNode;
  onConfirm: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  variant?: "default" | "destructive";
  children: ReactNode;
  footerContent?: ReactNode;
  loadingText?: string;
}

export const Modal = ({
  isOpen,
  onClose,
  title,
  confirmButtonText,
  onConfirm,
  isLoading = false,
  disabled = false,
  variant = "default",
  children,
  footerContent,
  loadingText = "Loading...",
}: ModalProps) => {
  if (!isOpen) return null;

  const handleContentClick = (e: MouseEvent) => {
    e.stopPropagation(); // Prevent click propagation to overlay
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative bg-background rounded-xl p-6 shadow-xl border border-grey4 max-w-md w-full" 
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={handleContentClick}
      >
        <h2 id="modal-title" className="text-xl font-bold text-foreground mb-4">
          {title}
        </h2>

        <div className="space-y-4 z-70">
          {children}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-foreground transition-colors disabled:opacity-50"
            disabled={isLoading}
            aria-label="Cancel"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={disabled || isLoading}
            className={`px-6 py-2 rounded-lg flex items-center gap-2 transition-colors ${
              variant === "destructive"
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-primary hover:bg-primary/90 text-white"
            }`}
            aria-label={typeof confirmButtonText === 'string' ? confirmButtonText : 'Confirm'}
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {isLoading ? loadingText : confirmButtonText}
          </button>
        </div>

        {footerContent && (
          <div className="mt-4">
            {footerContent}
          </div>
        )}
      </div>
    </div>
  );
};