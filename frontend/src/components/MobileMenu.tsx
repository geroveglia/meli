import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, X, Sun, Moon, Search } from 'lucide-react';
import { useThemeStore } from '../stores/themeStore';
import { useLocation, Link } from 'react-router-dom';

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileMenu: React.FC<MobileMenuProps> = ({ isOpen, onClose }) => {
  const { theme, toggleTheme } = useThemeStore();
  const [mounted, setMounted] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!mounted) return null;

  const menuItems = ['Product', 'Research', 'Explore', 'Company'];

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="mobile-menu-overlay"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
          className="fixed inset-0 z-[100] bg-neutral-50 dark:bg-neutral-950 p-6 md:hidden flex flex-col"
        >
          {/* Header with Logo and Close */}
          <div className="flex items-center justify-between mb-12">
            <div className="flex items-center gap-2 font-bold text-xl tracking-tighter text-primary-950 dark:text-primary-50">
              <Box
                className="text-primary-950 dark:text-primary-50"
                size={24}
                strokeWidth={2.5}
              />
              ANTIGRAVITY
            </div>
            <button
              onClick={onClose}
              className="p-2 text-black dark:text-white hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Links */}
          <div className="flex flex-col gap-6 flex-1">
            {menuItems.map((item) => {
              const href = `/${item === 'Product' ? '#product' : item === 'Research' ? '#research' : item === 'Explore' ? '#explore' : '#company'}`;
              const itemHash = href.includes("#") ? href.slice(href.indexOf("#")) : "";
              const isActive = location.pathname === "/" && (
                (location.hash === itemHash && itemHash !== "") ||
                (location.hash === "" && item === "Product")
              );

              return (
                <Link
                  key={item}
                  to={href}
                  className={`text-3xl font-medium transition-colors ${
                    isActive ? "text-accent-9" : "text-primary-950 dark:text-primary-50 hover:text-neutral-600 dark:hover:text-neutral-300"
                  }`}
                  onClick={onClose}
                >
                  {item}
                </Link>
              );
            })}
            <Link
              to="/components"
              className={`text-3xl font-medium transition-colors ${
                location.pathname === "/components" ? "text-accent-9" : "text-primary-950 dark:text-primary-50 hover:text-neutral-600 dark:hover:text-neutral-300"
              }`}
              onClick={onClose}
            >
              Components
            </Link>
          </div>

          {/* Footer Actions */}
          <div className="mt-auto space-y-6">
            <div className="flex items-center justify-between border-t border-gray-200 dark:border-white/10 pt-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-white/10 text-gray-600 dark:text-gray-400 transition-colors"
                >
                  {theme === 'dark' ? <Sun size={24} /> : <Moon size={24} />}
                </button>
                <button className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Search size={24} />
                </button>
              </div>
            </div>
            <a
              href="/login"
              className="block w-full text-center py-4 bg-primary-950 dark:bg-primary-50 text-white dark:text-primary-950 rounded-full font-bold text-lg"
            >
              Connect
            </a>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
};
