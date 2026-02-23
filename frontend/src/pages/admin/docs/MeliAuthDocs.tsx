import React from "react";
import { DocTitle, DocSubtitle, DocH2, DocH3, DocText, DocCodeBlock, DocAlert } from "../../../components/docs/DocContent";

export const MeliAuthDocs: React.FC = () => {
  return (
    <div>
      <DocTitle>Conexión y Autenticación con MercadoLibre</DocTitle>
      <DocSubtitle>
        Guía sobre cómo funciona el flujo OAuth2 para conectar aplicaciones de MercadoLibre y la correcta configuración de las URLs de redirección (Redirect URIs).
      </DocSubtitle>

      <DocH2 id="oauth-flow">Flujo de Autenticación (OAuth2)</DocH2>
      <DocText>
        Para que el sistema sincronice ventas y logística, debe conectarse a una cuenta de MercadoLibre utilizando el esquema estándar de OAuth2. El proceso es el siguiente:
      </DocText>

      <ol className="list-decimal pl-6 space-y-4 my-6 text-gray-700 dark:text-gray-300">
        <li>
          <strong>Iniciación:</strong> Desde el panel "Integraciones", el usuario ingresa su <code>App ID</code> y <code>Client Secret</code>.
        </li>
        <li>
          <strong>Redirección:</strong> El backend genera una URL segura enviando el usuario a la página de login de MercadoLibre junto con un parámetro de estado.
        </li>
        <li>
          <strong>Consentimiento:</strong> El usuario aprueba los permisos que la aplicación requiere (Lectura, Escritura, y Acceso Offline).
        </li>
        <li>
          <strong>Callback:</strong> MercadoLibre devuelve al usuario a la <strong>Redirect URI</strong> configurada en tu aplicación, con un <code>code</code> (código de autorización).
        </li>
        <li>
          <strong>Intercambio de Token:</strong> El backend de Lumba Connect usa ese código para pedirle a MercadoLibre un <code>access_token</code> (para hacer consultas) y un <code>refresh_token</code> (para renovar la conexión automáticamente).
        </li>
      </ol>

      <DocAlert type="warning" title="El problema del Callback (Redirect URI)">
        Si MercadoLibre detecta que la URL a la que intentas volver <strong>no es exactamente igual</strong> a la especificada en el panel de desarrolladores, bloqueará la conexión mostrando el error: <em>"Lo sentimos, la aplicación no puede conectarse a tu cuenta"</em>.
      </DocAlert>

      <DocH2 id="redirect-uri-config">Configuración Correcta de la Redirect URI</DocH2>
      <DocText>
        Dependiendo del entorno donde estés ejecutando la aplicación, la URL de redirección cambia. Es <strong>crucial</strong> actualizar este campo en el portal de MercadoLibre Developers.
      </DocText>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <h4 className="font-bold text-lg mb-2 text-indigo-600 dark:text-indigo-400">Entorno de Producción</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Cuando el proyecto está hosteado en un servidor real con dominio y certificado SSL.
          </p>
          <DocCodeBlock
            title="Redirect URI - Producción"
            language="bash"
            code={`https://autolab.fun:7001/api/v1/meli/callback`}
          />
        </div>

        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <h4 className="font-bold text-lg mb-2 text-green-600 dark:text-green-400">Entorno Local (Ngrok)</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Si pruebas en tu PC usando Ngrok para tener HTTPS (requerido por MercadoLibre).
          </p>
          <DocCodeBlock
            title="Redirect URI - Ngrok"
            language="bash"
            code={`https://[TU-CODIGO-NGROK].ngrok-free.app/api/v1/meli/callback`}
          />
        </div>
      </div>

      <DocH3>Cómo actualizarlo en MercadoLibre</DocH3>
      <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300 mb-6">
        <li>Ingresa a <a href="https://developers.mercadolibre.com.ar/devcenter/" target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Mis Aplicaciones de MercadoLibre</a>.</li>
        <li>Selecciona tu aplicación activa.</li>
        <li>Busca la sección <strong>Autenticación y Seguridad</strong>.</li>
        <li>Pega con precisión láser la <strong>URI de Redirección</strong>. No deben sobrar espacios vacíos ni barras <code>/</code> al final a menos que así esté en el código, y <strong>nunca se acepta HTTP genérico local</strong>.</li>
        <li>Asegurate de que los Scopes (Permisos) incluyan: <code>Offline_Access</code>, <code>Read</code>, y <code>Write</code>.</li>
        <li>Guarda los cambios.</li>
      </ul>

      <DocH2 id="backend-sync">Sincronización en Segundo Plano</DocH2>
      <DocText>
        Cuando MercadoLibre emite un <strong>webhook</strong> para alertar sobre nuevas compras o cambios logísticos, el servidor:
      </DocText>
      <ol className="list-decimal pl-6 space-y-2 mb-6 text-gray-700 dark:text-gray-300">
        <li>Recibe el mensaje verificando el <code>seller_id</code> (el ID del vendedor).</li>
        <li>Busca en la Base de Datos la Cuenta (o Tenant) vinculada a ese Seller ID.</li>
        <li>Verifica si el token expiró. Si expiró, llama a <code>refreshAccessToken</code> inyectándole el <strong>App ID</strong> y <strong>Client Secret</strong> guardados en la BD (para soportar multicuentas dinámicas, sin depender del <code>.env</code> estático).</li>
        <li>Consulta los detalles de la orden en la API y aplica las reglas de logística o status interno.</li>
      </ol>

      <DocAlert type="tip" title="Conexión Mutlicuenta">
        El sistema soporta vincular múltiples Apps configuradas. Asegúrate de siempre colocar las credenciales precisas en el popup del panel de Control.
      </DocAlert>
    </div>
  );
};
