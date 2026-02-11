import React from "react";
import { Footer } from "../components/Footer";
import { motion, Variants } from "framer-motion";
import { Layers, FileText, Truck, ArrowRight, CheckCircle2 } from "lucide-react";
import { useThemeStore } from "../stores/themeStore";
import { Link } from "react-router-dom";

// --- Animation Variants ---
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

export const ComponentsLab: React.FC = () => {
  const { theme } = useThemeStore();

  const steps = [
    {
      icon: Layers,
      title: "1. Conecta tus Cuentas",
      description: "Vincula todas tus cuentas de MercadoLibre en un solo lugar. Olvídate de iniciar sesión en múltiples plataformas.",
      color: "bg-blue-50 text-blue-600",
    },
    {
      icon: FileText,
      title: "2. Centraliza tu Facturación",
      description: "Visualiza, descarga y gestiona todas tus facturas y notas de crédito desde un único panel administrativo. Control total de tus finanzas.",
      color: "bg-green-50 text-green-600",
    },
    {
      icon: Truck,
      title: "3. Controla tu Logística",
      description: "Monitorea tus envíos en tiempo real, gestiona etiquetas y optimiza tu operación logística sin complicaciones.",
      color: "bg-yellow-50 text-yellow-600",
    },
  ];

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans transition-colors duration-300">
      
      <main className="pt-32 pb-20 px-4 container mx-auto">
        {/* Header */}
        <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="text-center mb-20 max-w-3xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-black mb-6">
            Cómo Funciona <br /> <span className="text-blue-600">Tu Nueva Gestión.</span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
            Nuestra plataforma unifica todo tu ecosistema de MercadoLibre. <br className="hidden md:block"/>
            Simplifica tu operación diaria en tres simples pasos.
          </p>
        </motion.div>

        {/* Steps Grid */}
        <motion.div 
          initial="hidden" 
          whileInView="visible" 
          viewport={{ once: true, margin: "-100px" }} 
          variants={staggerContainer} 
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24"
        >
          {steps.map((step, index) => (
            <motion.div 
              key={index} 
              variants={fadeInUp} 
              className="bg-gray-50 rounded-[2rem] p-8 border border-gray-100 hover:shadow-xl transition-shadow duration-300 relative overflow-hidden group"
            >
              <div className={`w-14 h-14 ${step.color} rounded-2xl flex items-center justify-center mb-6 shadow-sm`}>
                <step.icon size={28} />
              </div>
              <h3 className="text-2xl font-bold text-black mb-4">{step.title}</h3>
              <p className="text-gray-600 leading-relaxed">
                {step.description}
              </p>
              
              {/* Decoration */}
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-current opacity-5 rounded-full pointer-events-none text-gray-400 group-hover:scale-150 transition-transform duration-500 ease-out"></div>
            </motion.div>
          ))}
        </motion.div>

        {/* Feature Highlight Section */}
        <motion.div 
          initial="hidden" 
          whileInView="visible" 
          viewport={{ once: true }} 
          variants={fadeInUp} 
          className="bg-gray-100 text-black rounded-[2.5rem] p-8 md:p-16 relative overflow-hidden text-center"
        >
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-5xl font-bold mb-6 text-gray-900">Toma el control total.</h2>
            <p className="text-gray-600 text-lg mb-10">
              Deja de perder tiempo cambiando entre cuentas. Empieza a gestionar tu negocio de manera inteligente hoy mismo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="px-8 py-4 bg-blue-600 text-white font-bold rounded-full hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 shadow-sm">
                Crear Cuenta Gratis <ArrowRight size={20} />
              </Link>
              <Link to="/pricing" className="px-8 py-4 bg-white text-gray-900 font-bold rounded-full hover:bg-gray-50 transition-colors shadow-sm border border-gray-200">
                Ver Planes
              </Link>
            </div>
            
            <div className="mt-12 flex flex-wrap justify-center gap-6 text-sm text-gray-500">
              <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500"/> Sin tarjeta de crédito</span>
              <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500"/> Cancelación en cualquier momento</span>
              <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-green-500"/> Soporte 24/7</span>
            </div>
          </div>

          {/* Background Glow */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none translate-y-1/2 -translate-x-1/2"></div>
        </motion.div>

      </main>

      <Footer />
    </div>
  );
};
