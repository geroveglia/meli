// components/ButtonLink.tsx
import React from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronRight } from "@fortawesome/free-solid-svg-icons";

type ButtonVariant = "light" | "dark";

interface ButtonLinkProps {
  text: string;
  to?: string;
  variant?: ButtonVariant; // "light" => blanco, "dark" => tierra-900
  className?: string; // por si querés sumar clases extra
}

export const ButtonLink: React.FC<ButtonLinkProps> = ({ text, to = "/nosotros", variant = "light", className = "" }) => {
  const colorClasses = variant === "light" ? "text-white hover:text-white/80" : "text-tierra-900 hover:text-tierra-700";

  return (
    <div className={className}>
      <Link to={to} className={`inline-flex items-center gap-2 text-lg transition-colors ${colorClasses}`}>
        <FontAwesomeIcon icon={faChevronRight} className="text-sm" />
        <span className="font-rock underline decoration-dotted underline-offset-8">{text}</span>
      </Link>
    </div>
  );
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "blue" | "success" | "grey";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ children, variant = "primary", size = "md", isLoading, className = "", disabled, ...props }) => {
  const baseClasses = "inline-flex items-center justify-center rounded-lg transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-accent-9 text-white hover:bg-accent-8 focus:ring-accent-5 rounded-full font-semibold",
    secondary: "bg-accent-3 text-accent-1 hover:bg-accent-4 focus:ring-accent-4",
    ghost: "bg-transparent text-accent-7 hover:bg-accent-3 focus:ring-accent-4",
    danger: "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500",
    blue: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    success: "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500",
    grey: "bg-gray-400 text-white hover:bg-gray-500 focus:ring-gray-400",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };

  return (
    <button className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`} disabled={isLoading || disabled} {...props}>
      {isLoading ? (
        <>
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Loading...
        </>
      ) : (
        children
      )}
    </button>
  );
};
