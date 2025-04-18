type NoResultsProps = {
    hasQuery: boolean;
  };
  
  export const NoResults = ({ hasQuery }: NoResultsProps) => (
    hasQuery && (
      <p className="text-center text-gray-500 mt-4">
        No books found matching your criteria.
      </p>
    )
  );