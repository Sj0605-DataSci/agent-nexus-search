import { Button } from "@/components/ui/button";
import { FiChevronLeft, FiChevronRight, FiRefreshCw } from "react-icons/fi";

interface ChatNavigationControlsProps {
  currentIndex: number;
  totalItems: number;
  isStreaming: boolean;
  canNavigateNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  canNavigatePrevious: boolean;
  onRefresh: () => void;
  
}

export function ChatNavigationControls({
  currentIndex,
  totalItems,
  isStreaming,
  onPrevious,
  onNext,
  onRefresh,
}: ChatNavigationControlsProps) {
  if (totalItems <= 1) return null;

  return (
    <div className="flex justify-center items-center gap-3 mt-6">
      <Button
        variant="ghost"
        size="icon"
        onClick={onPrevious}
        disabled={currentIndex === 0 || isStreaming}
        className="rounded-full transition-colors text-gray-500 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <FiChevronLeft className="h-5 w-5" />
      </Button>
      <span className="text-sm font-medium tabular-nums text-gray-600">
        {currentIndex + 1} of {totalItems}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={onNext}
        disabled={currentIndex === totalItems - 1 || isStreaming}
        className="rounded-full transition-colors text-gray-500 hover:bg-gray-200 hover:text-gray-700 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <FiChevronRight className="h-5 w-5" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onRefresh}
        disabled={isStreaming}
        className="ml-2 rounded-full transition-colors text-gray-500 hover:bg-gray-200 hover:text-gray-700"
        title="Refresh thread"
      >
        <FiRefreshCw className="h-4 w-4" />
      </Button>
    </div>
  );
}
