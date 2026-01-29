import React from "react";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, disabled }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`
        relative inline-flex h-5 w-10 shrink-0 items-center rounded-full 
        transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 
        focus:ring-accent-5 focus:ring-offset-2
        ${checked 
          ? "bg-accent-9 border-accent-9 dark:bg-accent-1 dark:border-accent-1" 
          : "bg-accent-3 border-accent-4"
        }
        ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}
      `}
    >
      <span
        className={`
          ${checked ? "translate-x-6" : "translate-x-1"}
          pointer-events-none inline-block h-3 w-3 transform rounded-full 
          ${checked 
            ? "bg-accent-2 dark:bg-accent-10 shadow-sm" 
            : "bg-accent-7 dark:bg-accent-4"
          }
          transition duration-200 ease-in-out
        `}
      />
    </button>
  );
};
