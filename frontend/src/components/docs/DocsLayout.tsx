import React from "react";

interface DocsLayoutProps {
  children: React.ReactNode;
}

export const DocsLayout: React.FC<DocsLayoutProps> = ({ children }) => {

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300">
      {/* Main Content Wrapper to clear fixed sidebar */}
      <div className="flex-1 w-full lg:pl-64">
        <main className="w-full max-w-5xl mx-auto p-4 lg:p-8 pt-8 min-h-[calc(100vh-4rem)]">
          <div className="prose prose-slate dark:prose-invert max-w-none">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
