import React from "react";
import { motion, Variants } from "framer-motion";
import { Link } from "react-router-dom";



const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

import { BrandingSettings } from "../services/brandingService";


export const Footer: React.FC = () => {


  return (
    <motion.footer initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="mt-20 border-t border-accent-4 pt-16">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row md:justify-between items-start gap-12 mb-16">
          <div className="space-y-6 md:max-w-md">
            <div className="flex items-center gap-2">
              <Link to="/" className="flex items-center gap-2">
                <img
                  src="https://http2.mlstatic.com/frontend-assets/ml-web-navigation/ui-navigation/5.21.22/mercadolibre/logo__large_plus.png"
                  alt="Mercado Libre"
                  className="h-8 w-auto object-contain"
                />
              </Link>
            </div>
            <p className="text-accent-6 text-sm leading-relaxed hidden md:block">Plataforma centralizada para gestionar todas tus cuentas de MercadoLibre. Administra tu facturación y logística desde un solo panel.</p>
          </div>

          <div className="flex gap-16 md:gap-32 w-full md:w-auto">
            <div>
              <h4 className="font-bold mb-6 text-accent-5 text-xs tracking-widest uppercase">Navegación</h4>
              <ul className="space-y-4 text-sm text-accent-6">
                <li><Link to="/" className="hover:text-accent-1 transition-colors">Inicio</Link></li>
                <li><Link to="/login" className="hover:text-accent-1 transition-colors">Iniciar Sesión</Link></li>
                <li><Link to="/register" className="hover:text-accent-1 transition-colors">Registrarse</Link></li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-accent-4 py-8 flex flex-col items-center text-xs text-accent-6 font-mono">
          <div className="flex items-center gap-6">
            <span>© {new Date().getFullYear()} Meli Gestión. Todos los derechos reservados.</span>
          </div>
        </div>
      </div>
    </motion.footer>
  );
};
