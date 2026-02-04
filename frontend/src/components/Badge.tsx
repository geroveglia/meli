import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";

interface BadgeProps {
  children?: React.ReactNode;
  text?: string;
  icon?: IconDefinition;
  className?: string;
  variant?: "default"; 
  // We can add more variants if needed, but for now defaulting to the requested gray style
}

export const Badge: React.FC<BadgeProps> = ({ 
  children, 
  text, 
  icon, 
  className = "",
  variant = "default"
}) => {
  const content = text || children;

  // Default gray style (accent-5) as requested
  const baseClasses = "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-accent-5 text-white dark:bg-gray-700 dark:text-gray-100";

  return (
    <span className={`${baseClasses} ${className}`}>
      {icon && <FontAwesomeIcon icon={icon} className="mr-1.5 h-3 w-3" />}
      {content}
    </span>
  );
};
