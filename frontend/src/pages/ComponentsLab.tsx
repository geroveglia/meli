import React, { useState, useEffect } from "react";
import { carouselService, CarouselImage } from "../services/carouselImages";
import { useForm } from "react-hook-form";
import { useThemeStore } from "../stores/themeStore";
import { Toaster, toast } from "sonner";
import Swal from "sweetalert2";
import { motion, Variants, AnimatePresence } from "framer-motion";
import { Fingerprint, LayoutGrid, Zap, Sliders, Layers, Box, ArrowRight, CheckCircle2, Bell, ExternalLink, MousePointer2, Eye, EyeOff } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Swiper
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

// Components
import { Modal } from "../components/Modal";
import { Footer } from "../components/Footer";

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Animation Variants ---
const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 },
  },
};

const slideInLeft: Variants = {
  hidden: { opacity: 0, x: -30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6 },
  },
};

const slideInRight: Variants = {
  hidden: { opacity: 0, x: 30 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.6 },
  },
};

// --- Icons Data ---
const icons = [
  { icon: Fingerprint, label: "Auth" },
  { icon: LayoutGrid, label: "Layout" },
  { icon: Zap, label: "Actions" },
  { icon: Sliders, label: "Controls" },
  { icon: Layers, label: "Stack" },
  { icon: Box, label: "3D" },
];

export const ComponentsLab: React.FC = () => {
  const { register, handleSubmit, watch } = useForm();
  const [toggle, setToggle] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { theme } = useThemeStore();
  const [carouselImages, setCarouselImages] = useState<CarouselImage[]>([]);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const data = await carouselService.getAll();
        setCarouselImages(data.sort((a, b) => a.order - b.order));
      } catch (error) {
        console.error("Failed to fetch carousel images:", error);
      }
    };
    fetchImages();
  }, []);

  // Forms
  const onSubmit = (data: any) => {
    toast.success("Account created successfully", {
      description: `Welcome, ${data.email}`,
    });
  };

  const password = watch("password", "");
  const passwordStrength = Math.min(password.length * 10, 100);

  // SweetAlert
  const handleSweetAlert = () => {
    Swal.fire({
      title: "Monochrome",
      text: "This is a custom sweetalert2 modal styled for Antigravity.",
      icon: "info",
      background: "#0A0A0A",
      color: "#fff",
      confirmButtonColor: "#fff",
      confirmButtonText: "Close",
      customClass: {
        popup: "border border-white/10 rounded-2xl",
        confirmButton: "text-black font-bold px-6 py-2 rounded-full",
      },
    });
  };

  return (
    <div className="min-h-screen bg-accent-3 text-accent-9 font-sans p-4 md:p-8 transition-colors duration-300">
      <Toaster position="top-right" theme={theme} />

      {/* --- Main Content --- */}
      <main className="pt-32 pb-20 px-4 container mx-auto">
        <motion.div initial="hidden" animate="visible" variants={fadeInUp} className="mb-12">
          <h4 className="text-xs font-mono text-gray-500 tracking-widest mb-2">DESIGN SYSTEM V2.0</h4>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-black">UI Components Lab</h1>
            <div className="flex gap-4">
              <button className="px-6 py-2.5 rounded-full border border-accent-4 text-sm font-medium hover:bg-accent-2 transition-colors text-accent-8">Documentation</button>
              <button className="px-6 py-2.5 rounded-full bg-accent-9 text-accent-2 text-sm font-semibold hover:text-accent-9 hover:bg-accent-3 transition-colors shadow-lg">Download Kit</button>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* --- Registration Form --- */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideInLeft} className="lg:col-span-6 bg-accent-2 rounded-[2rem] p-8 md:p-10 border border-accent-4 shadow-xl dark:shadow-2xl relative overflow-hidden transition-colors duration-300">
            <div className="absolute top-0 right-0 p-4 opacity-50">
              <span className="px-3 py-1 rounded border border-accent-4 text-[10px] font-mono text-accent-5">useForm()</span>
            </div>

            <div className="flex items-center gap-3 mb-8">
              <div className="p-2 bg-accent-3 rounded-lg">
                <Layers size={20} className="text-accent-9" />
              </div>
              <h2 className="text-xl font-bold text-black">Registration Form</h2>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 w-full">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700 tracking-wider">EMAIL ADDRESS</label>
                <div className="relative">
                  <input {...register("email")} type="email" placeholder="name@company.com" className="w-full bg-accent-3 border border-accent-4 rounded-xl px-4 py-3.5 outline-none focus:border-accent-9 transition-colors text-sm text-black placeholder:text-gray-400" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-accent-5">@</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-xs font-bold text-gray-700 tracking-wider">PASSWORD</label>
                  <span className="text-[10px] text-accent-5">Min 8 chars</span>
                </div>
                <div className="relative">
                  <input {...register("password")} type={showPassword ? "text" : "password"} placeholder="••••••••" className="w-full bg-accent-3 border border-accent-4 rounded-xl px-4 py-3.5 outline-none focus:border-accent-9 transition-colors text-sm font-mono tracking-widest text-accent-9 placeholder:text-accent-5 pr-12" />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {password.length > 0 && <CheckCircle2 size={16} className="text-accent-9" />}
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="text-accent-5 hover:text-accent-9 transition-colors">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.div key={showPassword ? "hide" : "show"} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15 }}>
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </motion.div>
                      </AnimatePresence>
                    </button>
                  </div>
                </div>
                {/* Strength Indicator */}
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <label className="text-xs font-bold text-gray-700 tracking-wider">CONFIRM PASSWORD</label>
                </div>
                <div className="relative">
                  <input {...register("confirmPassword")} type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" className="w-full bg-accent-3 border border-accent-4 rounded-xl px-4 py-3.5 outline-none focus:border-accent-9 transition-colors text-sm font-mono tracking-widest text-accent-9 placeholder:text-accent-5 pr-12" />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="text-accent-5 hover:text-accent-9 transition-colors">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.div key={showConfirmPassword ? "hide" : "show"} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ duration: 0.15 }}>
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </motion.div>
                      </AnimatePresence>
                    </button>
                  </div>
                </div>
                {/* Strength Indicator */}
                <div className="flex gap-1 pt-2">
                  {[1, 2, 3, 4].map((step) => (
                    <div key={step} className={cn("h-1 rounded-full flex-1 transition-colors duration-300", passwordStrength / 25 >= step ? "bg-accent-9" : "bg-accent-3")}></div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setToggle(!toggle)} className={cn("w-10 h-6 rounded-full p-1 transition-colors duration-200 ease-in-out relative", toggle ? "bg-accent-9" : "bg-accent-3")}>
                    <div className={cn("w-4 h-4 bg-accent-1 rounded-full transition-transform duration-200 shadow-sm", toggle ? "translate-x-4" : "translate-x-0")}></div>
                  </button>
                  <span className="text-sm text-accent-6">Newsletter</span>
                </div>
                <a href="#" className="text-sm text-accent-6 hover:text-accent-9 transition-colors underline decoration-accent-4 underline-offset-4">
                  Forgot password?
                </a>
              </div>

              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="w-full bg-accent-9 text-accent-2 font-bold py-4 rounded-full text-sm flex items-center justify-center gap-2 mt-4 hover:text-accent-9 hover:bg-accent-3 transition-all">
                Create Account <ArrowRight size={16} />
              </motion.button>
            </form>
          </motion.div>

          {/* --- Right Column --- */}
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={slideInRight} className="lg:col-span-6 space-y-6">
            {/* Interactive UI */}
            <div className="bg-accent-2 rounded-[2rem] p-8 border border-accent-4 relative transition-colors duration-300">
              <div className="absolute top-6 right-6 flex gap-1">
                <div className="w-1.5 h-1.5 bg-accent-4 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-accent-4 rounded-full"></div>
                <div className="w-1.5 h-1.5 bg-accent-4 rounded-full"></div>
              </div>
              <h2 className="text-lg font-bold mb-8 text-black">Interactive UI</h2>

              <div className="space-y-4">
                {/* Sonner Toast */}
                <div className="group p-4 bg-accent-3 rounded-2xl border border-accent-4 hover:border-accent-9 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-accent-2 flex items-center justify-center border border-accent-4 text-accent-9">
                      <Bell size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-black">Sonner Toast</h3>
                      <p className="text-xs text-accent-6">Triggers stacked notification</p>
                    </div>
                  </div>
                  <button onClick={() => toast("Update deployed", { description: "Changes are live." })} className="px-4 py-2 bg-accent-9 text-accent-2 text-xs font-semibold rounded-full hover:text-accent-9 hover:bg-accent-3 transition-colors">
                    Test
                  </button>
                </div>

                {/* SweetAlert2 */}
                <div className="group p-4 bg-accent-3 rounded-2xl border border-accent-4 hover:border-accent-9 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-accent-2 flex items-center justify-center border border-accent-4 text-accent-9">
                      <ExternalLink size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-black">SweetAlert2</h3>
                      <p className="text-xs text-accent-6">Monochrome modal overlay</p>
                    </div>
                  </div>
                  <button onClick={handleSweetAlert} className="px-4 py-2 bg-accent-9 text-accent-2 text-xs font-semibold rounded-full hover:text-accent-9 hover:bg-accent-3 transition-colors">
                    Open
                  </button>
                </div>

                {/* Scale Tap */}
                <div className="group p-4 bg-accent-3 rounded-2xl border border-accent-4 hover:border-accent-9 transition-colors flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-accent-2 flex items-center justify-center border border-accent-4 text-accent-9">
                      <MousePointer2 size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-black">Scale Tap</h3>
                      <p className="text-xs text-accent-6">Micro-interaction test</p>
                    </div>
                  </div>
                  <motion.button whileTap={{ scale: 0.85 }} className="w-8 h-8 flex items-center justify-center bg-accent-4 rounded-full text-accent-9">
                    <MousePointer2 size={12} />
                  </motion.button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Icons Grid */}
              <div className="bg-accent-2 rounded-[2rem] p-6 border border-accent-4 flex flex-col justify-between transition-colors duration-300">
                <div>
                  <h2 className="text-lg font-bold mb-2 text-black">Icons</h2>
                  <p className="text-xs text-accent-6 mb-6">Material Symbols / Outlined</p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {icons.map((item, idx) => (
                    <div key={idx} className="aspect-square bg-accent-3 rounded-xl flex items-center justify-center hover:bg-accent-9 transition-colors cursor-pointer group">
                      <item.icon size={20} className="text-accent-5 group-hover:text-accent-1 transition-colors" />
                    </div>
                  ))}
                </div>
              </div>

              {/* System Status */}
              <div className="bg-accent-2 rounded-[2rem] p-6 border border-accent-4 flex flex-col items-center justify-center text-center transition-colors duration-300">
                <div className="w-16 h-16 rounded-full bg-accent-3 flex items-center justify-center mb-4 relative">
                  <div className="w-2 h-2 bg-accent-9 rounded-full absolute"></div>
                  <div className="w-16 h-16 bg-accent-9/10 rounded-full absolute animate-ping"></div>
                </div>
                <h3 className="font-bold text-sm mb-1 text-black">System Normal</h3>
                <p className="text-xs text-accent-9 font-mono">99.9% Uptime</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* --- Carousel Section --- */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="mt-20">
          <h2 className="text-2xl font-bold mb-8 text-black flex items-center gap-3">
            <Box size={24} /> Carousel Components
          </h2>

          <div className="w-full relative">
            <Swiper
              modules={[Navigation, Pagination, Autoplay]}
              spaceBetween={20}
              slidesPerView={1.2}
              centeredSlides={true}
              navigation={false}
              pagination={{ clickable: true }}
              autoplay={{ delay: 3000 }}
              breakpoints={{
                640: {
                  slidesPerView: 2,
                  centeredSlides: false,
                  navigation: true,
                },
                1024: {
                  slidesPerView: 3,
                  centeredSlides: false,
                  navigation: true,
                },
              }}
              className="pb-12"
            >
              {carouselImages.filter((img) => img.isActive).length > 0
                ? carouselImages
                    .filter((img) => img.isActive)
                    .map((image) => (
                      <SwiperSlide key={image._id}>
                        <div className="bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-0 rounded-[2rem] h-64 overflow-hidden shadow-sm hover:shadow-xl transition-shadow dark:hover:border-neutral-700 group cursor-grab active:cursor-grabbing relative">
                          <img src={`${(import.meta.env.VITE_API_URL || "http://localhost:8080/api/v1").replace("/api/v1", "")}${image.imageUrl}`} alt={image.title || "Carousel Image"} className="w-full h-full object-cover" />
                          {image.title && (
                            <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
                              <h3 className="text-lg font-bold">{image.title}</h3>
                            </div>
                          )}
                        </div>
                      </SwiperSlide>
                    ))
                : [1, 2, 3, 4, 5].map((item) => (
                    <SwiperSlide key={item}>
                      <div className="bg-accent-2 border border-accent-4 p-8 rounded-[2rem] h-64 flex flex-col justify-between shadow-sm hover:shadow-xl transition-shadow group cursor-grab active:cursor-grabbing">
                        <div className="flex justify-between items-start">
                          <div className="w-12 h-12 bg-accent-3 rounded-full flex items-center justify-center text-accent-9 group-hover:bg-accent-9 group-hover:text-accent-2 transition-colors">
                            <Layers size={20} />
                          </div>
                          <span className="text-xs font-mono text-accent-5">V2.0</span>
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-black mb-2">Component {item}</h3>
                          <p className="text-sm text-accent-6">Scalable react component with built-in dark mode and accessibility features.</p>
                        </div>
                      </div>
                    </SwiperSlide>
                  ))}
            </Swiper>
          </div>
        </motion.div>

        {/* --- Admin Modal Demo Section --- */}
        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeInUp} className="mt-12 bg-accent-2 border border-accent-4 text-accent-9 rounded-[2rem] p-12 relative overflow-hidden text-center">
          <div className="relative z-10 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold mb-4 text-black">Admin Modal Interface</h2>
            <p className="text-accent-6 mb-8">Fully responsive modal component with header, footer, and backdrop states, designed for the admin dashboard.</p>
            <button onClick={() => setIsModalOpen(true)} className="px-8 py-3 bg-accent-9 text-accent-2 font-bold rounded-full hover:text-accent-9 hover:bg-accent-3 transition-colors">
              Launch Demo Modal
            </button>
          </div>

          {/* Background decoration */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-500 rounded-full blur-[150px]"></div>
          </div>
        </motion.div>
      </main>

      <Footer />

      {/* --- Admin Demo Modal --- */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Admin Interface Modal"
        subtitle="This mimics the structure used in the dashboard"
        size="md"
        footer={
          <>
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium text-accent-6 hover:text-accent-9 transition-colors">
              Cancel
            </button>
            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium bg-accent-9 text-accent-2 rounded-full hover:text-accent-9 hover:bg-accent-3 transition-colors">
              Confirm Action
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-accent-7">This modal component is shared across the admin panel (`/admin`). It supports:</p>
          <ul className="list-disc pl-5 space-y-2 text-sm text-accent-6">
            <li>Backdrop blur and scroll locking</li>
            <li>Configurable sizes (sm, md, lg, xl, fullscreen)</li>
            <li>Custom header/footer slots</li>
            <li>Dark mode compatibility</li>
          </ul>
        </div>
      </Modal>
    </div>
  );
};
