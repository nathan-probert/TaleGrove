'use client';

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
  <form onSubmit={onSubmit} className="space-y-4 mb-6">
    {/* Input fields */}
    <div>
      <label htmlFor="title" className="block text-sm font-medium text-gray-700">
        Title
      </label>
      <input
        id="title"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
        placeholder="Enter book title"
      />
    </div>

    {/* Author input field */}

    <button
      type="submit"
      disabled={loading || (!title && !author)}
      className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? 'Searching...' : 'Search'}
    </button>
  </form>
);