"use client";

import { Loader2 } from "lucide-react";

type SearchFormProps = {
  title: string;
  author: string;
  loading: boolean;
  onTitleChange: (value: string) => void;
  onAuthorChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
};

export const SearchForm = ({
  title,
  author,
  loading,
  onTitleChange,
  onAuthorChange,
  onSubmit,
}: SearchFormProps) => (
  <div className="w-full max-w-md bg-background rounded-xl shadow-lg p-6 border border-grey4">
    <form onSubmit={onSubmit} className="space-y-6">
      <div>
        <label
          htmlFor="title"
          className="block text-sm font-medium text-foreground mb-2"
        >
          Title
        </label>
        <input
          id="title"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-grey4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder-grey2 text-foreground"
          placeholder="Enter book title"
          autoComplete="off"
        />
      </div>

      <div>
        <label
          htmlFor="author"
          className="block text-sm font-medium text-foreground mb-2"
        >
          Author
        </label>
        <input
          id="author"
          value={author}
          onChange={(e) => onAuthorChange(e.target.value)}
          className="w-full px-4 py-2.5 rounded-lg border border-grey4 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all placeholder-grey2 text-foreground"
          placeholder="Enter author name"
          autoComplete="off"
        />
      </div>

      <button
        type="submit"
        disabled={loading || (!title && !author)}
        className="w-full py-3 px-4 bg-primary hover:bg-primary/90 text-white font-medium rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Searching...</span>
          </>
        ) : (
          "Search Books"
        )}
      </button>
    </form>
  </div>
);
