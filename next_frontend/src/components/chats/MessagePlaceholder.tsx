import React from "react";

const PlaceholderDesktopRow = () => (
  <div className="flex w-full items-center space-x-4 p-2">
    <div className="w-1/6 h-8 bg-gray-200 rounded"></div>
    <div className="w-1/6 h-8 bg-gray-200 rounded"></div>
    <div className="w-1/6 h-8 bg-gray-200 rounded"></div>
    <div className="w-1/6 h-8 bg-gray-200 rounded"></div>
    <div className="w-1/12 h-7 bg-gray-200 rounded"></div>
    <div className="w-1/4 h-20 bg-gray-200 rounded"></div>
  </div>
);

const PlaceholderMobileCard = () => (
  <div className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
    <div className="flex justify-between items-center mb-4">
      <div className="h-6 w-1/2 bg-gray-200 rounded"></div>
      <div className="h-6 w-20 bg-gray-200 rounded"></div>
    </div>
    <div className="space-y-4">
      <div>
        <div className="h-4 w-24 bg-gray-300 rounded mb-2"></div>
        <div className="h-5 w-32 bg-gray-200 rounded"></div>
      </div>
      <div>
        <div className="h-4 w-16 bg-gray-300 rounded mb-2"></div>
        <div className="h-5 w-40 bg-gray-200 rounded"></div>
      </div>
      <div>
        <div className="h-4 w-20 bg-gray-300 rounded mb-2"></div>
        <div className="space-y-2">
          <div className="h-4 w-full bg-gray-200 rounded"></div>
          <div className="h-4 w-full bg-gray-200 rounded"></div>
          <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
        </div>
      </div>
    </div>
  </div>
);

const MessagePlaceholder = () => {
  return (
    <div className="w-full  animate-pulse">
      <div className="mb-4 flex justify-between items-center">
        <div className="h-8 w-32 bg-gray-200 rounded"></div>
      </div>
      <div className="rounded-xl md:p-6 bg-white md:border md:border-gray-200 md:shadow-sm">
        <div className="flex items-start">
          <div className="hidden md:flex mr-4 h-10 w-10 bg-gray-200 rounded-full"></div>
          <div className="flex-1">
            <div className="mb-4 flex space-x-4 border-b p-2 border-gray-200">
              <div className="h-6 w-24 bg-gray-200 rounded mb-2"></div>
              <div className="h-6 w-24 bg-gray-200 rounded mb-2"></div>
              <div className="h-6 w-24 bg-gray-200 rounded mb-2"></div>
            </div>

            <div className="w-full hidden xl:block">
              <div className="flex w-full text-left text-xs font-medium text-gray-500 uppercase tracking-wider mb-4 px-2">
                <div className="w-1/6 h-4 bg-gray-200 rounded"></div>
                <div className="w-1/6 h-4 bg-gray-200 rounded ml-4"></div>
                <div className="w-1/6 h-4 bg-gray-200 rounded ml-4"></div>
                <div className="w-1/6 h-4 bg-gray-200 rounded ml-4"></div>
                <div className="w-1/12 h-4 bg-gray-200 rounded ml-4"></div>
                <div className="w-1/4 h-4 bg-gray-200 rounded ml-4"></div>
              </div>
              <div className="divide-y divide-gray-200">
                {[...Array(5)].map((_, i) => (
                  <PlaceholderDesktopRow key={i} />
                ))}
              </div>
            </div>

            <div className="w-full block xl:hidden space-y-4">
              {[...Array(3)].map((_, i) => (
                <PlaceholderMobileCard key={i} />
              ))}
            </div>

            <div className="mt-6 flex justify-between items-center">
              <div className="h-4 mb-3 w-28 bg-gray-200 rounded"></div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagePlaceholder;
