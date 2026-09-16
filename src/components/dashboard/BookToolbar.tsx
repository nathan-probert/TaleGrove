"use client";

import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";

interface BookToolbarProps {
  query: string;
  onQueryChange: (query: string) => void;
  /** Clear the query and collapse the search row. */
  onClose: () => void;
  resultCount: number;
  totalCount: number;
  isSearching: boolean;
  /** True for whole-library search (changes count wording). */
  isGlobal?: boolean;
  /** True while the debounced global fetch (or folder cache load) is pending. */
  isLoading?: boolean;
}

export default function BookToolbar({
  query,
  onQueryChange,
  onClose,
  resultCount,
  totalCount,
  isSearching,
  isGlobal = false,
  isLoading = false,
}: BookToolbarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  // Autofocus the input whenever the row expands open.
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
    }
  };

  return (
    <div className="rounded-lg border border-grey4 bg-background p-3 shadow-sm sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-grey2"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            id="dashboard-search-input"
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search your library by title, author, or folder…"
            aria-label="Search books and folders across your library"
            className="w-full rounded-md border border-grey4 bg-background py-2 pl-9 pr-9 text-sm text-foreground placeholder:text-grey2 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {query !== "" && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Clear search and close"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-grey2 hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {isSearching && (
          <p
            className="flex shrink-0 items-center gap-1.5 text-xs text-grey2"
            aria-live="polite"
            role="status"
          >
            {isGlobal ? (
              isLoading && resultCount === 0 ? (
                <>Searching your library…</>
              ) : (
                <>
                  {resultCount} {resultCount === 1 ? "result" : "results"}{" "}
                  across your library
                </>
              )
            ) : (
              <>
                {resultCount} of {totalCount}{" "}
                {totalCount === 1 ? "item" : "items"}
              </>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
