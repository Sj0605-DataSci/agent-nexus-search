import React from "react";

interface LoadingSpinnerProps {
  size?: number;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 4,
  className = ""
}) => {
  return (
    <div className={`py-2 text-sm text-center w-full ${className}`}>
      <div 
        className={`inline-block h-${size} w-${size} animate-spin rounded-full border-2 border-solid border-current border-r-transparent`} 
      />
    </div>
  );
};

export default LoadingSpinner;
