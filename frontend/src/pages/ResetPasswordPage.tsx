import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export const ResetPasswordPage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { resetPassword } = useAuthStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data: ResetPasswordForm) => {
    if (!token) {
      setError("Falta el token de recuperación en la URL.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      await resetPassword(token, data.newPassword);
      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      console.error("[reset-password:error]", err);
      if (err.message && err.message.toLowerCase().includes("invalid")) {
        setError("El enlace de recuperación es inválido o ha expirado. Por favor solicita uno nuevo.");
      } else {
        setError(err.message || "Error al restablecer la contraseña.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-[#ebebeb] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white shadow-2xl rounded-2xl p-8 text-center">
          <h2 className="text-2xl font-bold text-green-600 mb-4">¡Contraseña Actualizada!</h2>
          <p className="text-gray-600 mb-6">Tu contraseña se ha restablecido correctamente.</p>
          <p className="text-sm text-gray-500">Serás redirigido al inicio de sesión en unos segundos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#ebebeb] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-2xl rounded-2xl p-8 border border-gray-200">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Crear nueva contraseña</h2>
            <p className="text-accent-8 text-sm mt-2">Ingresa tu nueva contraseña para acceder a tu cuenta.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" autoComplete="off">
            <div>
              <label className="block text-sm font-medium text-accent-1 mb-2">Nueva Contraseña</label>
              <div className="relative">
                <input 
                  {...register("newPassword")} 
                  type={showPassword ? "text" : "password"} 
                  className="input-base pr-10" 
                  placeholder="••••••••" 
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
              {errors.newPassword && <p className="text-red-500 text-sm mt-1">{errors.newPassword.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-accent-1 mb-2">Confirmar Contraseña</label>
              <div className="relative">
                <input 
                  {...register("confirmPassword")} 
                  type={showConfirmPassword ? "text" : "password"} 
                  className="input-base pr-10" 
                  placeholder="••••••••" 
                />
                <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                </button>
              </div>
              {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword.message}</p>}
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-800 rounded-lg">
                <p className="text-red-600 text-sm text-center">{error}</p>
              </div>
            )}

            <div className="flex flex-col gap-4">
              <button type="submit" disabled={isLoading} className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                {isLoading ? "Guardando..." : "Guardar contraseña"}
              </button>
              
              <Link to="/login" className="w-full text-center text-sm font-medium text-gray-500 hover:text-gray-700 transition">
                Volver al inicio de sesión
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
