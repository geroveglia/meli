import React from "react";
import { motion, Variants } from "framer-motion";



const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

import { BrandingSettings } from "../services/brandingService";


interface FooterProps {
  branding?: BrandingSettings | null;
}

export const Footer: React.FC<FooterProps> = ({ branding }) => {


  return (
    <motion.footer initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="mt-20 border-t border-accent-4 pt-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 mb-16">
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <a href="/" className="flex items-center gap-2">
                <img
                  src="https://http2.mlstatic.com/frontend-assets/ml-web-navigation/ui-navigation/5.21.22/mercadolibre/logo__large_plus.png"
                  alt="Mercado Libre"
                  className="h-8 w-auto object-contain"
                />
              </a>
            </div>
            <p className="text-accent-6 text-sm leading-relaxed hidden md:block">Pioneering the next generation of weightless digital interfaces. Built for speed, designed for the future.</p>
            <div className="flex gap-4">
              {[1, 2, 3].map((_, i) => (
                <div key={i} className="w-10 h-10 rounded-full bg-accent-3 flex items-center justify-center hover:bg-accent-4 transition-colors cursor-pointer border border-accent-4 text-accent-1">
                  {i === 0 && <span className="w-3 h-3 bg-accent-1 rounded-full"></span>}
                  {i === 1 && <span className="font-serif italic text-lg">@</span>}
                  {i === 2 && <span className="text-lg">*</span>}
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-1 gap-8 md:gap-0">
            <div>
              <h4 className="font-bold mb-6 text-accent-5 text-xs tracking-widest uppercase">Home</h4>
              <ul className="space-y-4 text-sm text-accent-6">
                <li className="hover:text-accent-1 cursor-pointer transition-colors">Framework</li>
                <li className="hover:text-accent-1 cursor-pointer transition-colors">Components</li>
                <li className="hover:text-accent-1 cursor-pointer transition-colors">Templates</li>
                <li className="hover:text-accent-1 cursor-pointer transition-colors">Enterprise</li>
              </ul>
            </div>

            <div className="md:hidden">
              <h4 className="font-bold mb-6 text-accent-5 text-xs tracking-widest uppercase">Legal</h4>
              <ul className="space-y-4 text-sm text-accent-6">
                <li className="hover:text-accent-1 cursor-pointer transition-colors">Privacy</li>
                <li className="hover:text-accent-1 cursor-pointer transition-colors">Terms</li>
                <li className="hover:text-accent-1 cursor-pointer transition-colors">License</li>
              </ul>
            </div>
          </div>

          <div>
            <h4 className="font-bold mb-6 text-accent-5 text-xs tracking-widest uppercase">Company</h4>
            <ul className="space-y-4 text-sm text-accent-6">
              <li className="hover:text-accent-1 cursor-pointer transition-colors">About</li>
              <li className="hover:text-accent-1 cursor-pointer transition-colors">Careers</li>
              <li className="hover:text-accent-1 cursor-pointer transition-colors">Blog</li>
              <li className="hover:text-accent-1 cursor-pointer transition-colors">Press</li>
            </ul>
          </div>

          <div className="hidden md:block">
            <h4 className="font-bold mb-6 text-accent-5 text-xs tracking-widest uppercase">Legal</h4>
            <ul className="space-y-4 text-sm text-accent-6">
              <li className="hover:text-accent-1 cursor-pointer transition-colors">Privacy</li>
              <li className="hover:text-accent-1 cursor-pointer transition-colors">Terms</li>
              <li className="hover:text-accent-1 cursor-pointer transition-colors">License</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-accent-4 py-8 flex flex-col md:flex-row justify-between items-center text-xs text-accent-6 font-mono">
          <div className="flex items-center gap-6">
            <span>© 2024 Antigravity Inc.</span>
          </div>
        </div>
      </div>
    </motion.footer>
  );
};
