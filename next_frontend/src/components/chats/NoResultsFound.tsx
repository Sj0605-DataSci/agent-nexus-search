import Image from "next/image";
import { FiSearch, FiRefreshCw, FiMail } from "react-icons/fi";

interface NoResultsFoundProps {
  onTryAgain: () => void;
  onClearQuery: () => void;
  onGetResultsByEmail?: () => void;
  isGuest?: boolean;
}

export default function NoResultsFound({
  onTryAgain,
  onClearQuery,
  onGetResultsByEmail,
  isGuest = false,
}: NoResultsFoundProps) {
  return (
    <div className="flex flex-col items-center justify-center w-full py-10 px-4 mx-auto">
      <Image
        src="/search/NoDataFound.svg"
        alt="No data found"
        width={100}
        height={100}
        className="mb-6"
        priority
      />
      <h3 className="text-xl font-medium text-gray-800 mb-2">No Results Found</h3>
      <p className="text-gray-600 text-center mb-6 max-w-md">
        We couldn't find any matching results for your query. Try adjusting your search terms or
        explore different keywords.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md justify-center">
        {isGuest && onGetResultsByEmail ? (
          <button
            onClick={onGetResultsByEmail}
            className="flex items-center justify-center h-10 px-5 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium rounded-md hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 shadow-sm"
          >
            <FiMail className="mr-2 h-4 w-4" />
            Get Results via Email
          </button>
        ) : (
          <button
            onClick={onTryAgain}
            className={`flex items-center justify-center h-10 px-5 py-2 ${
              isGuest && onGetResultsByEmail
                ? "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300"
                : "bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700"
            } text-sm font-medium rounded-md transition-all duration-200 shadow-sm`}
          >
            <FiSearch className="mr-2 h-4 w-4" />
            Try Another Search
          </button>
        )}
        <button
          onClick={onClearQuery}
          className="flex items-center justify-center h-10 px-5 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 shadow-sm"
        >
          <FiRefreshCw className="mr-2 h-4 w-4" />
          Clear Query
        </button>
      </div>
    </div>
  );
}
