import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheck } from "@fortawesome/free-solid-svg-icons";

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({ 
  label, 
  className = "", 
  checked, 
  disabled,
  ...props 
}) => {
  return (
    <label className={`flex items-center gap-3 cursor-pointer group ${disabled ? "opacity-50 cursor-not-allowed" : ""} ${className}`}>
      <div className="relative">
        <input
          type="checkbox"
          checked={checked}
          disabled={disabled}
          className="peer sr-only"
          {...props}
        />
        <div className={`
          w-5 h-5 rounded flex items-center justify-center border transition-all duration-200
          ${checked 
            ? "bg-accent-9 border-accent-9 text-accent-2 dark:bg-accent-1 dark:border-accent-1 dark:text-accent-2" 
            : "bg-transparent border-accent-4 hover:border-accent-6"
          }
        `}>
          <FontAwesomeIcon 
            icon={faCheck} 
            className={`text-xs transform transition-transform duration-200 ${checked ? "scale-100" : "scale-0"} ${checked ? "text-accent-2" : ""}`} 
          />
        </div>
      </div>
      {label && (
        <span className="text-sm text-accent-7 select-none group-hover:text-accent-1 transition-colors">
          {label}
        </span>
      )}
    </label>
  );
};
