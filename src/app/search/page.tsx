import BookForm from '@/components/BookForm'; // Adjust the import path as needed

export default function SearchPage() {
    return (
        <main className="container mx-auto px-4 py-8">
            <h1 className="text-2xl font-bold mb-4">Search for Books</h1>
            <BookForm />
        </main>
    );
}