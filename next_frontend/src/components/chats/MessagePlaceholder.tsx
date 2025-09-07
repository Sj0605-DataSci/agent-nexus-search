import React from "react";

const PlaceholderDesktopRow = () => (
  <tr className="border-0 transition-all items-center justify-between   duration-200 data-[state=selected]:bg-muted/80 cursor-pointer hover:bg-white relative group after:absolute after:inset-x-4 after:bottom-0 after:h-px after:bg-gradient-to-r after:from-transparent after:via-gray-100 after:to-transparent">
    <td className="p-3 w-40 py-3">
      <div className="flex items-center gap-4 pl-2">
        <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse"></div>
        <div className="space-y-2 w-40">
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-3 bg-gray-100 rounded w-1/2"></div>
        </div>
      </div>
    </td>
    <td className="p-3 min-w-40 py-3">
      <div className="flex items-center justify-center">
        <div className="h-7 w-7 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 animate-pulse"></div>
      </div>
    </td>
    <td className="p-3 w-full  py-3">
      <div className="space-y-2">
        <div className="h-3 bg-gray-100 rounded"></div>
        <div className="h-3 bg-gray-100 rounded w-5/6"></div>
        <div className="h-3 bg-gray-100 rounded w-2/3"></div>
      </div>
    </td>
    <td className="p-3 min-w-30 py-3">
      <div className="flex justify-center">
        <div className="h-8 w-8 rounded-full bg-gray-100 animate-pulse"></div>
      </div>
    </td>
  </tr>
);

const PlaceholderMobileCard = () => (
  <div className="p-4 mb-4 rounded-xl border-0 shadow-sm bg-white hover:bg-muted/50 cursor-pointer">
    <div className="flex items-start gap-4">
      <div className="h-12 w-12 rounded-full bg-gray-200 animate-pulse"></div>
      <div className="flex-1">
        <div className="flex justify-between items-start">
          <div className="h-5 bg-gray-200 rounded w-32 mb-2"></div>
          <div className="h-6 w-6 rounded-full bg-gray-200"></div>
        </div>
        <div className="h-4 bg-gray-100 rounded w-24 mb-2"></div>
        <div className="h-3 bg-gray-100 rounded w-16 mb-2"></div>
        <div className="space-y-1 mt-2">
          <div className="h-3 bg-gray-100 rounded w-full"></div>
          <div className="h-3 bg-gray-100 rounded w-5/6"></div>
          <div className="h-3 bg-gray-100 rounded w-2/3"></div>
        </div>
      </div>
    </div>
  </div>
);

interface MessagePlaceholderProps {
  message?: string;
}

const MessagePlaceholder = ({ message }: MessagePlaceholderProps) => {
  return (
    <div className="w-full md:px-20 animate-pulse">
      <div className="rounded-xl bg-white">
        <div className="flex items-start">
          <div className="flex-1">
            <div className="mb-4 flex space-x-4 border-b flex-row justify-between p-2 border-gray-200">
              <div className="h-8 w-24 bg-gray-200 rounded mb-2"></div>
              <div className="h-8 w-8 bg-gray-200 rounded mb-2"></div>
            </div>
            <div className="w-full hidden xl:block">
              <div className="sticky top-0 z-10 bg-white transition-shadow duration-200 shadow-[0_1px_0_0_rgba(0,0,0,0.05)] hover:shadow-[0_2px_0_0_rgba(0,0,0,0.1)]">
                <div className="flex items-center justify-between px-4 py-3">
                  <div className="w-[100px] h-6 bg-gray-200 rounded"></div>
                  <div className="w-20 h-6 bg-gray-200 rounded ml-12"></div>
                  <div className="flex items-start ">
                    <div className="w-48 h-6 bg-gray-200 rounded ml-12"></div>
                  </div>
                  <div className="w-10 h-6 bg-gray-200 rounded ml-12"></div>
                </div>
              </div>
              <div className="relative w-full overflow-auto">
                <table className="w-full caption-bottom text-sm border-separate border-spacing-0 [&_tr:not(:last-child)]:after:content-[''] [&_tr:not(:last-child)]:after:block [&_tr:not(:last-child)]:after:h-px [&_tr:not(:last-child)]:after:bg-gradient-to-r [&_tr:not(:last-child)]:after:from-transparent [&_tr:not(:last-child)]:after:via-gray-100 [&_tr:not(:last-child)]:after:to-transparent [&_tr:not(:last-child)]:after:mx-4">
                  <tbody className="[&_tr]:border-0 ">
                    {[...Array(5)].map((_, i) => (
                      <PlaceholderDesktopRow key={i} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="w-full block xl:hidden space-y-4">
              {[...Array(3)].map((_, i) => (
                <PlaceholderMobileCard key={i} />
              ))}
            </div>

            <div className="mt-6 flex justify-between items-center">
              {message ? (
                <div className="text-gray-500 text-center w-full py-4">{message}</div>
              ) : (
                <>
                  <div className="h-4 mb-3 w-28 bg-gray-200 rounded"></div>
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                    <div className="h-8 w-8 bg-gray-200 rounded-full"></div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagePlaceholder;
