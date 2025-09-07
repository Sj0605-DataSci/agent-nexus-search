import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  currentIndex: number;
  totalCount: number;
  onPrevious: () => void;
  onNext: () => void;
  className?: string;
}

const PaginationControls: React.FC<PaginationControlsProps> = ({
  currentIndex,
  totalCount,
  onPrevious,
  onNext,
  className = ''
}) => {
  if (totalCount <= 1) return null;

  const isFirst = currentIndex === 0;
  const isLast = currentIndex === totalCount - 1;

  return (
    <div className={`fixed bottom-6 left-0 right-0 flex justify-center z-50 ${className}`}>
      <div className="flex items-center gap-0.5 rounded-full border border-gray-100 bg-white/95 px-2 py-1.5 shadow-lg backdrop-blur-sm ring-1 ring-black/5">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPrevious();
          }}
          disabled={isFirst}
          className={`p-2.5 rounded-full flex items-center justify-center transition-all ${
            isFirst
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md'
          }`}
          aria-label="Previous profile"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        
        <div className="h-8 w-px bg-gray-100 mx-1.5" />
        
        <div className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-50 rounded-full border border-gray-100">
          <span className="font-semibold text-gray-900">{currentIndex + 1}</span>
          <span className="text-gray-500"> / {totalCount}</span>
        </div>
        
        <div className="h-8 w-px bg-gray-100 mx-1.5" />
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNext();
          }}
          disabled={isLast}
          className={`p-2.5 rounded-full flex items-center justify-center transition-all ${
            isLast
              ? 'text-gray-300 cursor-not-allowed'
              : 'text-gray-700 hover:bg-gray-50 active:bg-gray-100 hover:scale-105 active:scale-95 shadow-sm hover:shadow-md'
          }`}
          aria-label="Next profile"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
};

export default PaginationControls;
