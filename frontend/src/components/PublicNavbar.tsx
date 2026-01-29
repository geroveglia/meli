import React, { useState } from "react";
import { useThemeStore } from "../stores/themeStore";
import { MobileMenu } from "./MobileMenu";
import { Search, ArrowUpRight, Menu, X, Sun, Moon } from "lucide-react";
import { Logo } from "./Logo";
import { useLocation, Link } from "react-router-dom";

export const PublicNavbar: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { theme, toggleTheme } = useThemeStore();
  const location = useLocation();

  const navLinks = [
    { label: "Home", href: "/#product" },
    { label: "Components", href: "/components" },
    { label: "Explore", href: "/#explore" },
    { label: "Company", href: "/#company" },
  ];

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-accent-2/80 backdrop-blur-md border-b border-accent-4 transition-colors duration-300">
        <div className="container mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo to="/" wrapperClassName="flex items-center gap-2" />
          </div>

          <div className="hidden md:flex items-center bg-accent-2 rounded-full border border-accent-4 gap-3 p-1">
            {navLinks.map((item) => {
              const itemHash = item.href.includes("#") ? item.href.slice(item.href.indexOf("#")) : "";
              const isActive = item.href === location.pathname || (location.pathname === "/" && ((location.hash === itemHash && itemHash !== "") || (location.hash === "" && item.label === "Home")));

              return (
                <Link key={item.label} to={item.href} className={`px-5 py-2 text-sm transition-colors rounded-full ${isActive ? "text-accent-9 bg-accent-3" : "text-accent-6 hover:text-accent-9 hover:bg-accent-3"}`}>
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-4">
            <button onClick={toggleTheme} className="p-2 text-accent-6 hover:text-accent-9 transition-colors">
              {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className="p-2 text-accent-6 hover:text-accent-9 transition-colors">
              <Search size={20} />
            </button>
            <a href="/login" className="group flex items-center gap-2 px-5 py-2.5 bg-accent-9 text-accent-2 text-sm font-semibold rounded-full hover:text-accent-9 hover:bg-accent-3 transition-colors">
              Connect <ArrowUpRight size={16} className="group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>

          {/* Mobile Toggle */}
          <button className="md:hidden text-accent-9" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            {isMobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>

        {/* Mobile Menu Fullscreen Overlay */}
        <MobileMenu isOpen={isMobileMenuOpen} onClose={() => setIsMobileMenuOpen(false)} />
      </nav>
    </>
  );
};
