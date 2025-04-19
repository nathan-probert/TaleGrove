export function NoResults({ hasQuery }: { hasQuery: boolean }) {
  return (
    <div className="text-center py-6">
      <h3 className="text-lg font-medium text-foreground mb-2">
        {hasQuery ? "No books found" : "Start your search"}
      </h3>
      <p className="text-grey2">
        {hasQuery
          ? "Try different search terms"
          : "Enter a title or author in the search form above"}
      </p>
    </div>
  );
}