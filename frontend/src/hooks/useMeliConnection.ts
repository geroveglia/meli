
import { useCallback } from "react";
import Swal from "sweetalert2";
import { meliService } from "../services/meliService";
import { Cuenta } from "../api/cuentas";
import { sweetAlert } from "../utils/sweetAlert";

export const useMeliConnection = (onUpdate?: () => void) => {

  const connect = useCallback(async (cuenta: Cuenta) => {
      const result = await Swal.fire({
          title: "Conectar con MercadoLibre",
          html: `
            <div class="text-sm text-gray-600">
                <p class="mb-3">Serás redirigido a MercadoLibre para autorizar la conexión para la cuenta <strong>${cuenta.name}</strong>.</p>
                <div class="bg-yellow-50 p-3 rounded-md border border-yellow-200 text-left mb-3">
                    <p class="font-bold text-yellow-800 mb-1">⚠️ Importante:</p>
                    <p class="mb-2">Si ya tienes una sesión iniciada en MercadoLibre en este navegador, se conectará automáticamente a esa cuenta.</p>
                    <p>Si deseas conectar una cuenta diferente, <strong>asegúrate de cerrar sesión en MercadoLibre primero</strong>.</p>
                </div>
                <a href="https://www.mercadolibre.com.ar" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:text-blue-800 underline font-medium">
                    Abrir MercadoLibre para verificar sesión <i class="fas fa-external-link-alt ml-1"></i>
                </a>
            </div>
          `,
          icon: "info",
          showCancelButton: true,
          confirmButtonColor: "#2563eb",
          cancelButtonColor: "var(--accent-4)",
          confirmButtonText: "Continuar a Conectar",
          cancelButtonText: "Cancelar",
          reverseButtons: true,
      });

      if (!result.isConfirmed) return;

      try {
          const url = await meliService.getAuthUrl(cuenta._id);
          window.location.href = url;
      } catch (error) {
          console.error("Error initiating MELI connection:", error);
          sweetAlert.error("Error", "No se pudo iniciar la conexión con MercadoLibre");
      }
  }, []);

  const disconnect = useCallback(async (cuenta: Cuenta) => {
    const result = await sweetAlert.confirm(
        "Desconectar MercadoLibre",
        `¿Estás seguro de que deseas desconectar la cuenta de MercadoLibre para "${cuenta.name}"? Dejarás de recibir actualizaciones.`,
        "warning",
        "Desconectar",
        "Cancelar"
    );

    if (!result.isConfirmed) return;

    try {
         await meliService.disconnect(cuenta._id);
         sweetAlert.success("Desconectado", "La cuenta se ha desconectado correctamente.");
         if (onUpdate) onUpdate();
    } catch (error) {
        console.error("Error disconnecting MELI:", error);
        sweetAlert.error("Error", "No se pudo desconectar la cuenta");
    }
  }, [onUpdate]);

  return { connect, disconnect };
};
