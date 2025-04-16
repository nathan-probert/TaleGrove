import { Book } from '@/types';

type Props = {
  books: Book[];
  userId: string | null;
  onDelete: (id: string) => void;
};

export default function BookList({ books, userId, onDelete }: Props) {
  return (
    <div>      
      <ul className="space-y-4">
        {books.length === 0 ? (
            <p>
            No books added yet. Would you like to{' '}
            <a href="/search" className="text-blue-500 hover:underline">
              add one
            </a>
            ?
            </p>
        ) : (
          books.map((book) => (
            <li key={book.id} className="border p-4 rounded shadow">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-semibold">{book.title}</h2>
                  <p className="text-gray-700">by {book.author}</p>
                  <p className="text-sm">⭐ Rating: {book.rating}/10</p>
                  {book.notes && <p className="mt-2 italic">"{book.notes}"</p>}
                </div>
                <button
                  className="bg-red-500 text-white px-3 py-1 rounded"
                  onClick={() => onDelete(book.id)}
                >
                  Delete
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}