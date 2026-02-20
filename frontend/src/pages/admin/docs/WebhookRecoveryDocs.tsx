import React from "react";
import { DocTitle, DocSubtitle, DocH2, DocH3, DocText, DocCodeBlock, DocAlert } from "../../../components/docs/DocContent";

export const WebhookRecoveryDocs: React.FC = () => {
  return (
    <div>
      <DocTitle>Recuperación de Webhooks Perdidos</DocTitle>
      <DocSubtitle>
        Cómo el sistema garantiza que no se pierdan ventas ni actualizaciones de envío cuando el servidor está caído.
      </DocSubtitle>

      <DocH2 id="como-funciona-meli">¿Cómo envía MercadoLibre las notificaciones?</DocH2>
      <DocText>
        Cuando ocurre un evento en MercadoLibre (nueva venta, cambio de estado de envío, etc.), MELI envía una notificación <strong>webhook</strong> a nuestro servidor. Nuestro servidor debe responder con un <code>HTTP 200 OK</code> inmediatamente para confirmar la recepción.
      </DocText>

      <DocH3>Política de reintentos de MercadoLibre</DocH3>
      <DocText>
        Si nuestro servidor no responde con un <code>200 OK</code>, MercadoLibre reintenta la notificación con el siguiente esquema:
      </DocText>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center">
          <h4 className="font-bold text-2xl mb-1 text-red-600 dark:text-red-400">8</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">Intentos máximos</p>
        </div>
        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center">
          <h4 className="font-bold text-2xl mb-1 text-yellow-600 dark:text-yellow-400">1 hora</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">Tiempo límite total</p>
        </div>
        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-center">
          <h4 className="font-bold text-2xl mb-1 text-blue-600 dark:text-blue-400">Exponencial</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">Tipo de backoff</p>
        </div>
      </div>

      <DocAlert type="warning" title="Después de 1 hora">
        Si el servidor no responde con un <code>200 OK</code> durante los 8 intentos dentro de la hora, MercadoLibre <strong>descarta la notificación permanentemente</strong> de la cola automática. No se volverá a enviar.
      </DocAlert>

      <DocH2 id="respuesta-inmediata">Respuesta inmediata del webhook</DocH2>
      <DocText>
        Nuestro controlador de webhooks responde con <code>200 OK</code> <strong>inmediatamente</strong> al recibir la notificación, antes de procesar cualquier lógica. Esto evita que MercadoLibre active sus reintentos mientras el servidor está encendido.
      </DocText>

      <DocCodeBlock
        title="server/src/controllers/meliController.ts"
        code={`
export const webhook = async (req: Request, res: Response) => {
    try {
        const { topic, resource, user_id } = req.body;
        
        // Respond 200 OK immediately to MELI to avoid retries
        res.status(200).send("OK");

        // ... luego procesa la notificación en background
        await handleNotification(topic, resource, tenantId, clientId);
    } catch (e) {
        // Ya enviamos el 200 OK, cualquier error se logea internamente
        console.error("Error processing webhook:", e);
    }
};
        `}
      />

      <DocAlert type="success" title="Estado actual">
        Esta lógica ya está implementada. Si el servidor está encendido, MELI nunca activará reintentos.
      </DocAlert>

      <DocH2 id="missed-feeds">Recuperación de Feeds Perdidos (missed_feeds)</DocH2>
      <DocText>
        El problema real ocurre cuando el servidor está <strong>completamente caído</strong> por más de 1 hora. En ese caso, MELI agota sus 8 intentos y descarta la notificación. Para resolver esto, el sistema implementa un mecanismo de recuperación usando el endpoint <code>/missed_feeds</code> de MercadoLibre.
      </DocText>

      <DocH3>¿Cómo funciona?</DocH3>
      <div className="my-6 p-6 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <ol className="list-decimal pl-6 space-y-3 text-gray-700 dark:text-gray-300">
          <li>Al <strong>arrancar el servidor</strong>, se ejecuta automáticamente el proceso de recuperación.</li>
          <li>El sistema busca todas las <strong>Cuentas</strong> y <strong>Tenants</strong> con conexión activa a MercadoLibre.</li>
          <li>Para cada cuenta, verifica si el <strong>access token</strong> está expirado y lo refresca si es necesario.</li>
          <li>Consulta el endpoint <code>GET /missed_feeds?app_id=&#123;APP_ID&#125;</code> con el token válido.</li>
          <li>Si hay feeds perdidos, los procesa uno por uno usando <em>la misma lógica</em> que el webhook normal (<code>handleNotification</code>).</li>
        </ol>
      </div>

      <DocCodeBlock
        title="server/src/services/meliService.ts — recoverMissedFeeds()"
        code={`
export const recoverMissedFeeds = async (
    tenantId, clientId, accessToken, appId
) => {
    const response = await fetch(
        \`https://api.mercadolibre.com/missed_feeds?app_id=\${appId}\`,
        { headers: { "Authorization": \`Bearer \${accessToken}\` } }
    );
    
    const data = await response.json();
    
    if (data.messages?.length > 0) {
        for (const message of data.messages) {
            const { topic, resource } = message;
            // Reprocesa usando la misma lógica del webhook
            await handleNotification(topic, resource, tenantId, clientId);
        }
    }
};
        `}
      />

      <DocH2 id="cuando-se-ejecuta">¿Cuándo se ejecuta la recuperación?</DocH2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <h4 className="font-bold text-lg mb-2 text-blue-600 dark:text-blue-400">🔄 Al arrancar el servidor</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Automáticamente después de conectarse a la base de datos. No bloquea el arranque — se ejecuta en background.
          </p>
        </div>
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <h4 className="font-bold text-lg mb-2 text-green-600 dark:text-green-400">🖥️ Manualmente desde terminal</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Ejecutar <code>npm run recover-webhooks</code> desde la carpeta <code>server/</code> en cualquier momento.
          </p>
        </div>
      </div>

      <DocH2 id="escenarios">Escenarios</DocH2>

      <div className="my-6 overflow-x-auto">
        <table className="min-w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <thead className="bg-gray-100 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Escenario</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">¿Se pierde data?</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Mecanismo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            <tr>
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300">Server caído {"<"} 1 hora</td>
              <td className="px-4 py-3 text-green-600 dark:text-green-400 font-semibold">No</td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">MELI reintenta (8 intentos). Al volver, el webhook llega normalmente.</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300">Server caído {">"} 1 hora</td>
              <td className="px-4 py-3 text-green-600 dark:text-green-400 font-semibold">No</td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">MELI descarta la notificación, pero al reiniciar el server se consultan los <code>missed_feeds</code>.</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300">Server encendido, error interno</td>
              <td className="px-4 py-3 text-green-600 dark:text-green-400 font-semibold">No</td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">El <code>200 OK</code> se envía antes de la lógica. El error se logea pero MELI no reintenta.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <DocAlert type="tip" title="Comando de recuperación manual">
        Si sospechas que se perdieron webhooks, podés ejecutar el script de recuperación manualmente:<br />
        <code>cd server && npm run recover-webhooks</code>
      </DocAlert>
    </div>
  );
};
