const LoadingSkeleton = () => (
  <div className="animate-pulse p-8">
    <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/3 mb-6" />
    <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-1/2 mb-4" />
    <div className="h-64 bg-gray-100 dark:bg-gray-900 rounded mb-4" />
    <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-1/3 mb-2" />
    <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded w-1/4" />
  </div>
);
export default LoadingSkeleton;
