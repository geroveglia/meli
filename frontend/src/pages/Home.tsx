import React, { useState, useEffect } from "react";
import { Footer } from "../components/Footer";
import { ArrowUpRight, Box, Activity, Layers, Globe } from "lucide-react";
import { motion, Variants } from "framer-motion";
import { brandingService, BrandingSettings } from "../services/brandingService";

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2,
    },
  },
};

export const Home: React.FC = () => {
  const [branding, setBranding] = useState<BrandingSettings | null>(null);

  useEffect(() => {
    brandingService.getBranding().then(setBranding).catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-accent-3 text-black font-sans selection:bg-accent-9 selection:text-accent-1 transition-colors duration-300">
      {/* --- Navbar --- */}

      <main className="pt-32 pb-20 px-4 container mx-auto">
        {/* --- Hero Section --- */}
        <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="relative rounded-[2.5rem] bg-accent-3 overflow-hidden border border-accent-4 min-h-[85vh] flex flex-col justify-center p-8 md:p-16 shadow-2xl dark:shadow-none transition-colors duration-300">
          {/* Background Effects */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent-3/50 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-accent-2/50 rounded-full blur-[150px] pointer-events-none translate-y-1/2 -translate-x-1/3"></div>

          {/* Content */}
          <div className="relative z-10 max-w-5xl">
            <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8 }} className="text-5xl sm:text-6xl md:text-8xl lg:text-[6rem] font-extrabold leading-[0.9] tracking-tight mb-8 text-black">
              GESTIÓN <br />
              UNIFICADA <br />
              <span className="text-accent-5">MERCADOLIBRE.</span>
            </motion.h1>

            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.8 }} className="text-lg md:text-2xl text-accent-6 max-w-2xl mb-12 font-light leading-relaxed">
              Unifica todas tus cuentas de MercadoLibre en una sola plataforma. Visualiza y administra tu facturación y logística desde un panel administrativo centralizado.
            </motion.p>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.6 }} className="flex items-center gap-4">
              <button className="px-6 py-3 md:px-8 md:py-4 bg-accent-9 text-accent-2 font-bold rounded-full flex items-center gap-2 hover:opacity-90 hover:bg-accent-3 dark:hover:bg-accent-3 hover:text-accent-9 transition-colors text-sm md:text-base">
                Comenzar Ahora <ArrowUpRight size={20} />
              </button>
              <div className="flex gap-1 px-4">
                <span className="w-12 h-1 bg-accent-9 rounded-full"></span>
                <span className="w-2 h-1 bg-accent-4 rounded-full"></span>
                <span className="w-2 h-1 bg-accent-4 rounded-full"></span>
              </div>
            </motion.div>
          </div>

          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8, duration: 0.5 }} className="absolute top-8 right-8 text-accent-4">
            <ArrowUpRight size={32} />
          </motion.div>
        </motion.div>

        {/* --- Stats and Features Grid --- */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={staggerContainer} className="grid grid-cols-1 md:grid-cols-12 gap-6 mt-6">
          {/* Card 1: Users */}
          <motion.div variants={fadeInUp} className="md:col-span-3 bg-accent-2 rounded-[2rem] p-8 border border-accent-4 relative overflow-hidden group shadow-xl dark:shadow-none transition-colors duration-300">
            <div className="absolute top-6 left-6 w-10 h-10 bg-accent-3 rounded-full flex items-center justify-center">
              <Globe size={20} className="text-accent-9" />
            </div>
            <div className="absolute top-6 right-6 px-3 py-1 bg-accent-3 rounded-full text-xs font-mono border border-accent-4 text-accent-8">↗ +12.4%</div>

            <div className="mt-24">
              <h3 className="text-5xl font-bold mb-2 text-black">Multi</h3>
              <p className="text-xs tracking-widest text-accent-5 uppercase font-semibold">Cuentas Conectadas</p>
            </div>

            <div className="absolute bottom-4 left-4 right-4 h-1 bg-accent-3 rounded-full overflow-hidden">
              <div className="w-[70%] h-full bg-accent-9"></div>
            </div>
          </motion.div>

          {/* Card 2: Modular Architecture */}
          <motion.div variants={fadeInUp} className="md:col-span-5 bg-accent-2 rounded-[2rem] p-8 border border-accent-4 relative overflow-hidden shadow-xl dark:shadow-none transition-colors duration-300">
            <div className="w-10 h-10 bg-accent-3 rounded-lg flex items-center justify-center mb-6">
              <Layers size={20} className="text-accent-9" />
            </div>

            <h3 className="text-3xl font-bold mb-4 text-black">
              Facturación <br /> Centralizada
            </h3>
            <p className="text-accent-6 text-sm leading-relaxed max-w-xs mb-8">Administra facturas y notas de crédito de todas tus cuentas.</p>

            <button className="flex items-center gap-3 px-6 py-3 bg-accent-3 border border-accent-4 rounded-full text-xs font-bold tracking-widest hover:bg-accent-4 transition-colors text-accent-9">
              <ArrowUpRight size={16} /> explore
            </button>

            {/* 3D Cube Abstract Graphic */}
            <div className="absolute top-1/2 right-4 -translate-y-1/2 opacity-10 dark:opacity-30">
              <Box size={180} strokeWidth={0.5} className="text-accent-9" />
            </div>
          </motion.div>

          {/* Card 3: Live Updates */}
          <motion.div variants={fadeInUp} className="md:col-span-4 bg-accent-2 rounded-[2rem] p-8 border border-accent-4 flex flex-col shadow-xl dark:shadow-none transition-colors duration-300">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                <span className="text-sm font-bold text-black">Logística en Vivo</span>
              </div>
              <Activity size={16} className="text-accent-5" />
            </div>

            <div className="space-y-6 relative">
              {/* Timeline Line */}
              <div className="absolute left-[5px] top-2 bottom-2 w-[1px] bg-accent-4"></div>

              <div className="relative pl-6">
                <div className="absolute left-0 top-1.5 w-2.5 h-2.5 bg-accent-2 border border-accent-9 rounded-full z-10"></div>
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-mono text-accent-5">10:42 AM</span>
                  <span className="text-[10px] bg-accent-9 text-accent-2 px-1.5 py-0.5 rounded font-bold">NEW</span>
                </div>
                <p className="text-sm font-medium text-black">Stock sincronizado.</p>
              </div>

              <div className="relative pl-6 opacity-60">
                <div className="absolute left-0 top-1.5 w-2.5 h-2.5 bg-accent-2 border border-accent-5 rounded-full z-10"></div>
                <div className="mb-1">
                  <span className="text-[10px] font-mono text-accent-5">09:15 AM</span>
                </div>
                <p className="text-sm font-medium text-accent-8">Envío entregado a tiempo.</p>
              </div>

              <div className="relative pl-6 opacity-40">
                <div className="absolute left-0 top-1.5 w-2.5 h-2.5 bg-accent-2 border border-accent-5 rounded-full z-10"></div>
                <div className="mb-1">
                  <span className="text-[10px] font-mono text-accent-5">07:30 AM</span>
                </div>
                <p className="text-sm font-medium text-accent-8">Etiqueta generada correctamente.</p>
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* --- Footer --- */}
        <Footer branding={branding} />
      </main>
    </div>
  );
};
