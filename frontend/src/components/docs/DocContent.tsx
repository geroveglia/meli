import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faInfoCircle, faExclamationTriangle, faCheckCircle, faLightbulb } from "@fortawesome/free-solid-svg-icons";

// --- Typography ---

export const DocTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50 mb-6 pb-4 border-b border-gray-200 dark:border-gray-700">
    {children}
  </h1>
);

export const DocSubtitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 font-light leading-relaxed">
    {children}
  </p>
);

export const DocH2: React.FC<{ children: React.ReactNode; id?: string }> = ({ children, id }) => (
  <h2 id={id} className="text-2xl font-bold text-gray-800 dark:text-gray-100 mt-12 mb-4 scroll-mt-24 group">
    {children}
    <a href={`#${id}`} className="ml-2 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity hover:text-blue-500">#</a>
  </h2>
);

export const DocH3: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mt-8 mb-3">
    {children}
  </h3>
);

export const DocText: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-base text-gray-700 dark:text-gray-300 leading-7 mb-4">
    {children}
  </p>
);

// --- Components ---

export const DocCodeBlock: React.FC<{ code: string; language?: string; title?: string }> = ({ code, language = "typescript", title }) => (
  <div className="my-6 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 shadow-sm">
    {title && (
      <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-xs font-mono text-gray-500 dark:text-gray-400">
        {title}
      </div>
    )}
    <pre className="p-4 overflow-x-auto text-sm font-mono leading-relaxed text-gray-800 dark:text-gray-200">
      <code className={`language-${language}`}>{code.trim()}</code>
    </pre>
  </div>
);

type AlertType = "info" | "warning" | "success" | "tip";

export const DocAlert: React.FC<{ type?: AlertType; title?: string; children: React.ReactNode }> = ({ type = "info", title, children }) => {
  const styles = {
    info: {
      bg: "bg-blue-50 dark:bg-blue-900/20",
      border: "border-blue-200 dark:border-blue-800",
      icon: faInfoCircle,
      iconColor: "text-blue-600 dark:text-blue-400",
      textColor: "text-blue-900 dark:text-blue-100",
    },
    warning: {
      bg: "bg-yellow-50 dark:bg-yellow-900/20",
      border: "border-yellow-200 dark:border-yellow-800",
      icon: faExclamationTriangle,
      iconColor: "text-yellow-600 dark:text-yellow-400",
      textColor: "text-yellow-900 dark:text-yellow-100",
    },
    success: {
      bg: "bg-green-50 dark:bg-green-900/20",
      border: "border-green-200 dark:border-green-800",
      icon: faCheckCircle,
      iconColor: "text-green-600 dark:text-green-400",
      textColor: "text-green-900 dark:text-green-100",
    },
    tip: {
      bg: "bg-purple-50 dark:bg-purple-900/20",
      border: "border-purple-200 dark:border-purple-800",
      icon: faLightbulb,
      iconColor: "text-purple-600 dark:text-purple-400",
      textColor: "text-purple-900 dark:text-purple-100",
    },
  };

  const currentStyle = styles[type];

  return (
    <div className={`my-6 rounded-lg border ${currentStyle.bg} ${currentStyle.border} p-4`}>
      <div className="flex gap-4">
        <div className="flex-shrink-0">
          <FontAwesomeIcon icon={currentStyle.icon} className={`w-5 h-5 ${currentStyle.iconColor}`} />
        </div>
        <div className="flex-1">
          {title && <h5 className={`font-semibold mb-1 ${currentStyle.textColor}`}>{title}</h5>}
          <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
