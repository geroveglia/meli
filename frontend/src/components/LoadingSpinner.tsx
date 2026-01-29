import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message = "Cargando...",
  size = 'md'
}) => {
  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'h-6 w-6';
      case 'lg':
        return 'h-16 w-16';
      default:
        return 'h-12 w-12';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-accent-2">
      <div className="text-center">
        <div className={`animate-spin rounded-full border-b-2 border-accent-9 mx-auto mb-4 ${getSizeClasses()}`}></div>
        <p className="text-accent-6 font-medium">{message}</p>
      </div>
    </div>
  );
};