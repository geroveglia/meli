import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useAuthStore } from "../stores/authStore";

const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email format"),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export const ForgotPasswordPage: React.FC = () => {
  const { t } = useTranslation();
  const { forgotPassword } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsLoading(true);
    setError("");
    setMessage("");

    try {
      const resultMessage = await forgotPassword(data.email);
      setMessage(resultMessage || "Si el correo está registrado, recibirás un enlace de recuperación.");
    } catch (err: any) {
      console.error("[forgot-password:error]", err);
      // We generally want to show the same message even on error to prevent email enumeration,
      // but if it's a network error we can show that.
      if (err.message && err.message.toLowerCase().includes("network")) {
        setError("Error de red. Por favor intenta más tarde.");
      } else {
        setMessage("Si el correo está registrado, recibirás un enlace de recuperación.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#ebebeb] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white shadow-2xl rounded-2xl p-8 animate-slide-up border border-gray-200">
          <div className="text-center mb-6">
            <div className="flex justify-center items-center">
              <img src="https://http2.mlstatic.com/frontend-assets/ml-web-navigation/ui-navigation/5.22.8/mercadolibre/logo__large_plus.png" alt="Mercado Libre" className="h-[34px] mb-4" />
            </div>
            <h2 className="text-xl font-bold text-gray-800">Recuperar Contraseña</h2>
            <p className="text-accent-8 text-sm mt-2">Ingresa tu correo electrónico para recibir un enlace de recuperación.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" autoComplete="off">
            <div>
              <label className="block text-sm font-medium text-accent-1 mb-2">{t("auth.email")}</label>
              <input 
                {...register("email")} 
                type="email" 
                className="input-base" 
                placeholder="tu@email.com" 
                autoComplete="email" 
              />
              {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>}
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-800 dark:border-red-800 rounded-lg">
                <p className="text-red-600 dark:text-red-400 text-sm text-center">{error}</p>
              </div>
            )}

            {message && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-700 text-sm text-center font-medium">{message}</p>
              </div>
            )}

            <div className="flex flex-col gap-4">
              <button type="submit" disabled={isLoading} className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed">
                {isLoading ? t("common.loading") : "Enviar enlace"}
              </button>
              
              <Link 
                to="/login"
                className="w-full text-center text-sm font-medium text-gray-500 hover:text-gray-700 transition"
              >
                Volver al inicio de sesión
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
