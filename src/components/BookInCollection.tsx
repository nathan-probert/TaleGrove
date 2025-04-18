import { Book } from "@/types";

// Define a minimal type for the Google Books API item
interface GoogleBooksVolume {
  volumeInfo: {
    description?: string;
    // Add other relevant fields if needed
  };
  // Add other relevant fields if needed
}

interface BookInCollectionProps {
  book: Book;
  item: GoogleBooksVolume;
  onBack: () => void;
}

export default function BookInCollection({ book, item, onBack }: BookInCollectionProps) {
    const volumeInfo = item.volumeInfo;
    
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
        <p className="text-green-500">This book is already in your collection.</p>
      </div>
    );
  }
  