import React from "react";
import { Link, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBook, faCode, faLayerGroup, faBars, faXmark } from "@fortawesome/free-solid-svg-icons";
import { useState } from "react";

interface DocsLayoutProps {
  children: React.ReactNode;
}

export const DocsLayout: React.FC<DocsLayoutProps> = ({ children }) => {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    {
      section: "General",
      items: [
        { label: "Introducción", path: "/admin/doc", icon: faBook },
        { label: "Estructura del Proyecto", path: "/admin/doc/structure", icon: faLayerGroup },
      ],
    },
    {
      section: "Lumba (MercadoLibre)",
      items: [
        { label: "Lógica & Estados", path: "/admin/doc/meli-logic", icon: faCode },
      ],
    },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-300 lg:pl-64">
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-20 right-4 z-50">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 bg-white dark:bg-gray-800 rounded-md shadow-md border border-gray-200 dark:border-gray-700"
        >
          <FontAwesomeIcon icon={mobileMenuOpen ? faXmark : faBars} />
        </button>
      </div>

      {/* Docs Sidebar - Secondary Navigation */}
      <aside
        className={`fixed top-16 bottom-0 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto transition-transform duration-300 z-30
          ${mobileMenuOpen ? "translate-x-0 left-0" : "-translate-x-full lg:translate-x-0 lg:left-64"}
        `}
      >
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
              D
            </div>
            <h1 className="text-xl font-bold tracking-tight">Documentación</h1>
          </div>
        </div>

        <nav className="p-4 space-y-8">
          {menuItems.map((section) => (
            <div key={section.section}>
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 px-2">
                {section.section}
              </h3>
              <ul className="space-y-1">
                {section.items.map((item) => (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors
                        ${
                          isActive(item.path)
                            ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700/50"
                        }
                      `}
                    >
                      <FontAwesomeIcon icon={item.icon} className={`w-4 h-4 ${isActive(item.path) ? "opacity-100" : "opacity-70"}`} />
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto p-4 lg:p-8 pt-8 min-h-[calc(100vh-4rem)] lg:pl-72">
        <div className="prose prose-slate dark:prose-invert max-w-none">
          {children}
        </div>
      </main>
    </div>
  );
};
