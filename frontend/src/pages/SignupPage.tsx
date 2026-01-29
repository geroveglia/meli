import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "../stores/authStore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash, faCheckCircle, faTimes } from "@fortawesome/free-solid-svg-icons";
import { Logo } from "../components/Logo";

// ===== Success Modal Component =====
interface SuccessModalProps {
  isOpen: boolean;
  email: string;
  onContinue: () => void;
}

const SuccessModal: React.FC<SuccessModalProps> = ({ isOpen, email, onContinue }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-neutral-950/40 dark:bg-neutral-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-accent-2 rounded-2xl w-full max-w-lg shadow-2xl animate-slide-up overflow-hidden border border-accent-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-accent-4">
          <h2 className="text-xl font-semibold text-accent-9">¡Cuenta creada exitosamente!</h2>
          <button
            onClick={onContinue}
            className="text-accent-1 hover:opacity-70 transition-opacity"
          >
            <FontAwesomeIcon icon={faTimes} className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8">
          {/* Success Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-accent-3 rounded-full flex items-center justify-center">
              <FontAwesomeIcon icon={faCheckCircle} className="w-10 h-10 text-accent-9" />
            </div>
          </div>

          {/* Success Message */}
          <p className="text-center text-accent-8 mb-8">
            Se ha creado un usuario administrador con las credenciales que ingresaste. Ya puedes comenzar a usar la plataforma.
          </p>

          {/* Credentials Box */}
          <div className="bg-accent-3 rounded-xl p-6 border border-accent-4 text-center">
            <p className="text-accent-7 mb-3">Credenciales de acceso:</p>
            <p className="text-accent-8">
              Email: <span className="font-semibold text-accent-9">{email}</span>
            </p>
            <p className="text-accent-7 text-sm mt-2">
              Contraseña: La que ingresaste en el registro
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex justify-end">
          <button
            onClick={onContinue}
            className="btn-primary"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  );
};

// ===== Esquema de Validación =====
const signupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  companyName: z.string().min(1, "Company name is required"),
  slug: z.string().min(3, "Slug must be at least 3 characters").regex(/^[a-z0-9-]+$/, "Slug must contain only lowercase letters, numbers, and hyphens"),
  email: z.string().email("Invalid email format"),
  phone: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type SignupForm = z.infer<typeof signupSchema>;

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { registerTenant } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  });

  // Auto-generate slug from company name
  const companyName = watch("companyName");
  React.useEffect(() => {
    if (companyName) {
      const generatedSlug = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-") // Replace non-alphanumeric with hyphens
        .replace(/^-+|-+$/g, ""); // Trim hyphens
      setValue("slug", generatedSlug, { shouldValidate: true });
    }
  }, [companyName, setValue]);

  const handleContinue = () => {
    setShowSuccessModal(false);
    navigate("/admin/dashboard");
  };

  const onSubmit = async (data: SignupForm) => {
    setIsLoading(true);
    setError("");
    try {
      await registerTenant({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        companyName: data.companyName,
        slug: data.slug,
        phone: data.phone,
      });
      // Show success modal instead of navigating directly
      setRegisteredEmail(data.email);
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error("Signup error:", err);
      // Extraemos el mensaje de error de la API
      const msg = err.message || "Failed to create account. Please try again.";
       // Si es un error de duplicado (ej. email ya existe)
      if (msg.includes("already registered") || msg.includes("already exists")) {
          setError("This email or company name is already registered.");
      } else {
           setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SuccessModal 
        isOpen={showSuccessModal} 
        email={registeredEmail} 
        onContinue={handleContinue} 
      />
      <div className="min-h-screen bg-accent-3 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="bg-accent-2 shadow-xl rounded-2xl p-8 animate-slide-up border border-accent-4">
            <div className="text-center mb-6">
              <div className="flex justify-center items-center mb-2">
                <Logo sizeClass="text-3xl" />
              </div>
              <h2 className="text-xl font-bold text-accent-9">Create your account</h2>
              <p className="text-accent-7">Start managing your organization today</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" autoComplete="off">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-accent-9 mb-1">First Name</label>
                  <input {...register("firstName")} type="text" className="input-base" placeholder="John" />
                  {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-accent-9 mb-1">Last Name</label>
                  <input {...register("lastName")} type="text" className="input-base" placeholder="Doe" />
                  {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-accent-9 mb-1">Company Name</label>
                <input {...register("companyName")} type="text" className="input-base" placeholder="Acme Inc." />
                {errors.companyName && <p className="text-red-500 text-xs mt-1">{errors.companyName.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-accent-9 mb-1">
                   Workspace URL <span className="text-accent-6 font-normal">(Auto-generated)</span>
                 </label>
                 <div className="flex items-center">
                   <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-accent-4 bg-accent-3 text-accent-7 text-sm py-2.5">
                     app.domain.com/
                   </span>
                   <input 
                      {...register("slug")} 
                      type="text" 
                      className="input-base rounded-l-none" 
                      placeholder="acme-inc" 
                   />
                 </div>
                 {errors.slug && <p className="text-red-500 text-xs mt-1">{errors.slug.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-accent-9 mb-1">Email</label>
                <input {...register("email")} type="email" className="input-base" placeholder="john@company.com" />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>

               <div>
                <label className="block text-sm font-medium text-accent-9 mb-1">Phone (Optional)</label>
                <input {...register("phone")} type="tel" className="input-base" placeholder="+1 (555) 000-0000" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-accent-9 mb-1">Password</label>
                  <div className="relative">
                    <input {...register("password")} type={showPassword ? "text" : "password"} className="input-base pr-10" placeholder="••••••••" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-accent-9 mb-1">Confirm Password</label>
                   <div className="relative">
                    <input {...register("confirmPassword")} type={showConfirmPassword ? "text" : "password"} className="input-base pr-10" placeholder="••••••••" />
                    <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} className="h-4 w-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                   <div className="mt-0.5 text-red-500"><FontAwesomeIcon icon={faCheckCircle} className="rotate-45" /></div>
                  <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                </div>
              )}

              <button type="submit" disabled={isLoading} className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed mt-2">
                {isLoading ? "Creating Account..." : "Create Account"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-accent-7">
                Already have an account?{" "}
                <Link to="/login" className="font-medium text-primary-600 hover:text-primary-500 hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
