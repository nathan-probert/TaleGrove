import { Book, GoogleBooksVolume } from "@/types";
import { getUserId, addBook } from "@/lib/supabase";


interface BookNotInCollectionProps {
  book: Book;
  item: GoogleBooksVolume;
  onBack: () => void;
}


export default function BookNotInCollection({ book, item, onBack }: BookNotInCollectionProps) {
  const volumeInfo = item.volumeInfo;

  // Function to handle adding the book to the collection
  const onAddToCollection = async () => {
    const userId = await getUserId();
    if (!userId) {
      alert("Please log in to add books to your collection.");
      return;
    }

    addBook(book);
    alert(`${book.title} added to your collection!`);

    onBack();
  };

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <button
        onClick={onBack}
        className="mb-6 px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition"
      >
        ← Back
      </button>

      <h1 className="text-3xl font-bold mb-2">{book.title}</h1>
      <p className="text-gray-700 mb-4">by {book.author}</p>
      <img
        src={book.cover_url ?? ''}
        alt={book.title}
        className="mb-4 shadow-lg float-left mr-4"
      />
      <div
        className="text-gray-800 mb-4"
        dangerouslySetInnerHTML={{ __html: volumeInfo.description || 'No description available.' }}
      />
      <button
        onClick={onAddToCollection}
        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-300"
      >
        Add to Collection
      </button>
    </div>
  );
}
