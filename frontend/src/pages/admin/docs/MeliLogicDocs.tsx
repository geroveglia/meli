import React from "react";
import { DocTitle, DocSubtitle, DocH2, DocH3, DocText, DocCodeBlock, DocAlert } from "../../../components/docs/DocContent";

export const MeliLogicDocs: React.FC = () => {
  return (
    <div>
      <DocTitle>Lógica &amp; Estados de MercadoLibre</DocTitle>
      <DocSubtitle>
        Documentación detallada sobre las máquinas de estado de Logística y Ventas, y cómo se integran con la API real de MercadoLibre.
      </DocSubtitle>

      <DocAlert type="info" title="Entorno de Testing">
        El sistema está <strong>conectado a la API real de MercadoLibre</strong>, pero utilizando una <strong>aplicación de testing</strong> con <strong>usuarios de prueba</strong>. Esto permite probar todos los flujos (webhooks, órdenes, envíos) en un entorno seguro sin afectar cuentas reales.
      </DocAlert>

      <DocH2 id="state-machines">Máquinas de Estado</DocH2>
      <DocText>
        El sistema maneja tres tipos de estados principales para cada orden, permitiendo un desacoplamiento entre lo que sucede en MercadoLibre y los procesos internos de logística y facturación.
      </DocText>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <h4 className="font-bold text-lg mb-2 text-yellow-600 dark:text-yellow-400">1. Meli Status</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">Estado puro de la plataforma MELI (shipping).</p>
          <ul className="mt-3 text-sm list-disc list-inside space-y-1">
            <li>ready_to_ship</li>
            <li>shipped</li>
            <li>delivered</li>
            <li>not_delivered</li>
            <li>cancelled</li>
          </ul>
        </div>
        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <h4 className="font-bold text-lg mb-2 text-blue-600 dark:text-blue-400">2. Logistics Status</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">Estado interno para el flujo de preparación.</p>
          <ul className="mt-3 text-sm list-disc list-inside space-y-1">
            <li>pendiente_preparacion</li>
            <li>listo_para_entregar</li>
            <li>despachado_meli</li>
            <li>retiro_local</li>
            <li>entregado</li>
            <li>cancelado_vuelto_stock</li>
            <li>devolucion_vuelto_stock</li>
          </ul>
        </div>
        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <h4 className="font-bold text-lg mb-2 text-green-600 dark:text-green-400">3. Sales Status</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">Estado interno para facturación.</p>
          <ul className="mt-3 text-sm list-disc list-inside space-y-1">
            <li>pendiente_facturacion</li>
            <li>facturada</li>
            <li>venta_cancelada</li>
            <li>nota_credito</li>
          </ul>
        </div>
      </div>

      <DocH2 id="logistics-flow">Flujo de Logística</DocH2>
      <DocText>
        Cuando MercadoLibre envía un webhook con una nueva orden pagada, el sistema la guarda en la base de datos con el estado interno <code>pendiente_preparacion</code>. A partir de ahí, el operador realiza acciones manuales para avanzar la orden por el flujo.
      </DocText>

      <DocH3>1. En Preparación (pendiente_preparacion)</DocH3>
      <DocText>
        Es el estado inicial de toda orden nueva. Aquí el operador tiene <strong>3 acciones</strong> disponibles que deben realizarse en orden:
      </DocText>
      <div className="my-6 p-6 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
        <ol className="list-decimal pl-6 space-y-4 text-gray-700 dark:text-gray-300">
          <li>
            <strong>📦 Empaquetar</strong> — El operador verifica el stock físico, prepara el producto y presiona el botón de empaquetar. Esto marca la orden como <code>packaged: true</code>, indicando que el producto ya fue sacado del stock y metido en la caja/bolsa.
          </li>
          <li>
            <strong>🖨️ Imprimir Etiqueta</strong> — El sistema genera una etiqueta (ficticia en testing, real en producción vía la API de MercadoLibre). Se marca como <code>tagStatus: "impresas"</code>. El operador debe pegar la etiqueta en el paquete físico.
          </li>
          <li>
            <strong>🚚 Listo para Entregar</strong> — Solo se habilita cuando la orden está <strong>empaquetada</strong> Y <strong>con etiqueta impresa</strong>. Al presionar, la orden pasa a <code>listo_para_entregar</code>.
          </li>
        </ol>
      </div>

      <DocAlert type="tip" title="Retiro en Local">
        Si la orden tiene el tag <code>no_shipping</code> (el comprador eligió retiro en persona), en lugar de "Imprimir Etiqueta" y "Listo para Entregar", aparece un botón de <strong>🏠 Retiro en Local</strong> que mueve la orden directamente a <code>retiro_local</code>. Este botón solo se habilita cuando la orden ya está empaquetada.
      </DocAlert>

      <DocH3>2. Listo para Entregar (listo_para_entregar)</DocH3>
      <DocText>
        El paquete está preparado con su etiqueta pegada, listo para ser despachado. En esta etapa el operador debe llevar el paquete a una sucursal de correo o esperar la colecta de MercadoLibre.
      </DocText>
      <DocAlert type="info" title="Transición automática">
        El estado cambia automáticamente a <code>despachado_meli</code> cuando el correo escanea la etiqueta en la sucursal. Esto llega como un webhook de MercadoLibre con el shipping status <code>shipped</code>.
      </DocAlert>

      <DocH3>3. Despachado ML (despachado_meli)</DocH3>
      <DocText>
        El paquete ya fue entregado al correo y está en tránsito hacia el comprador. <strong>No requiere ninguna acción manual.</strong> El sistema actualiza automáticamente este estado cuando MercadoLibre envía el webhook con <code>shipped</code>.
      </DocText>
      <DocAlert type="info" title="Transición automática">
        Cuando MercadoLibre confirma la entrega (<code>delivered</code>), la orden pasa automáticamente a <code>entregado</code>.
      </DocAlert>

      <DocH3>4. Retiro en Local (retiro_local)</DocH3>
      <DocText>
        El comprador viene a buscar el producto al local. El operador debe verificar la identidad del comprador y presionar <strong>✅ Marcar Entregado</strong> para finalizar. Esto mueve la orden a <code>entregado</code>.
      </DocText>

      <DocH3>5. Entregado (entregado)</DocH3>
      <DocText>
        Estado final exitoso. La orden fue recibida por el comprador, ya sea por envío o retiro en local. Queda como historial de entregas finalizadas.
      </DocText>

      <DocH3>6. Cancelaciones y Devoluciones</DocH3>
      <DocText>
        El sistema detecta cancelaciones de dos formas:
      </DocText>
      <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300 mb-4">
        <li><strong>Automática:</strong> Cuando MercadoLibre envía un webhook con shipping status <code>cancelled</code> o <code>not_delivered</code>, o con tags <code>cancelled</code>/<code>not_delivered</code>, la orden se mueve a <code>cancelado_vuelto_stock</code>.</li>
        <li><strong>Devolución:</strong> Si una orden que ya estaba en <code>entregado</code> es cancelada, se mueve a <code>devolucion_vuelto_stock</code> en lugar de cancelado.</li>
      </ul>

      <DocH3>7. Desempaquetar</DocH3>
      <DocText>
        Cuando una orden se cancela o se devuelve, si el producto ya estaba <strong>empaquetado</strong> (<code>packaged: true</code>), la orden <strong>no va directamente</strong> a la pestaña de Cancelados o Devoluciones. En su lugar, aparece primero en la pestaña <strong>"Desempaquetar"</strong>.
      </DocText>
      <div className="my-6 p-6 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3"><strong>¿Por qué existe esta sección?</strong></p>
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
          Si un producto fue empaquetado físicamente (sacado del estante, puesto en caja, con etiqueta pegada), el operador necesita <strong>deshacerlo manualmente</strong> antes de devolver el producto al stock disponible. La pestaña "Desempaquetar" sirve como recordatorio de que hay que procesar físicamente ese paquete.
        </p>
        <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Flujo:</strong></p>
        <ol className="list-decimal pl-6 space-y-2 text-sm text-gray-700 dark:text-gray-300 mt-2">
          <li>Llega un webhook de cancelación/devolución → la orden se marca como <code>cancelado_vuelto_stock</code> o <code>devolucion_vuelto_stock</code>.</li>
          <li>Como <code>packaged: true</code>, la orden aparece en la pestaña <strong>"Desempaquetar"</strong>.</li>
          <li>El operador busca el paquete físico, saca el producto y lo devuelve al estante.</li>
          <li>Presiona el botón <strong>📦 Desempaquetar</strong> → la orden se marca como <code>packaged: false</code>.</li>
          <li>La orden <strong>desaparece de "Desempaquetar"</strong> y aparece en su pestaña correspondiente: <strong>"Cancelados"</strong> (si fue <code>cancelado_vuelto_stock</code>) o <strong>"Devoluciones"</strong> (si fue <code>devolucion_vuelto_stock</code>).</li>
        </ol>
      </div>

      <DocAlert type="info" title="Filtro de pestañas">
        La pestaña <strong>Cancelados</strong> solo muestra órdenes con <code>packaged: false</code>. La pestaña <strong>Devoluciones</strong> también solo muestra las que ya fueron desempaquetadas. Esto garantiza que el operador siempre procese primero el paquete físico antes de dar la orden por cerrada.
      </DocAlert>

      <DocH3>Diagrama de Flujo Completo</DocH3>
      <div className="my-6 overflow-x-auto">
        <table className="min-w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <thead className="bg-gray-100 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Estado</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Acción / Evento</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Siguiente estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            <tr>
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">pendiente_preparacion</td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">Empaquetar + Imprimir + Listo</td>
              <td className="px-4 py-3 text-blue-600 dark:text-blue-400 font-semibold">listo_para_entregar</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">pendiente_preparacion</td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">Empaquetar + Retiro en Local (tag no_shipping)</td>
              <td className="px-4 py-3 text-blue-600 dark:text-blue-400 font-semibold">retiro_local</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">listo_para_entregar</td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">🔄 Webhook: correo escanea etiqueta (shipped)</td>
              <td className="px-4 py-3 text-blue-600 dark:text-blue-400 font-semibold">despachado_meli</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">despachado_meli</td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">🔄 Webhook: entrega confirmada (delivered)</td>
              <td className="px-4 py-3 text-green-600 dark:text-green-400 font-semibold">entregado ✅</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">retiro_local</td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">Operador marca entregado</td>
              <td className="px-4 py-3 text-green-600 dark:text-green-400 font-semibold">entregado ✅</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">Cualquier estado</td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">🔄 Webhook: cancelled / not_delivered</td>
              <td className="px-4 py-3 text-red-600 dark:text-red-400 font-semibold">cancelado_vuelto_stock ❌</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">entregado</td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">🔄 Webhook: devolución / reclamo</td>
              <td className="px-4 py-3 text-orange-600 dark:text-orange-400 font-semibold">devolucion_vuelto_stock 🔄</td>
            </tr>
          </tbody>
        </table>
      </div>


      <DocH2 id="sales-flow">Flujo de Ventas (Facturación)</DocH2>
      <DocText>
        El flujo de ventas corre <strong>en paralelo</strong> a la logística. Una orden puede estar despachada pero no facturada, o viceversa. Ambos flujos son independientes y tienen sus propios estados.
      </DocText>

      <DocH3>1. Pendiente de Facturación (pendiente_facturacion)</DocH3>
      <DocText>
        Toda orden nueva llega con este estado. Desde aquí el operador puede realizar dos acciones:
      </DocText>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-8">
        <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <h4 className="font-bold text-lg mb-2 text-blue-600 dark:text-blue-400">📄 Facturar (Manual)</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            El operador presiona el botón <strong>Facturar</strong> en la tabla o tarjeta de la orden. Se registra como <code>billingType: "manual"</code>.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Ideal cuando la factura se emite en un sistema externo (ej. AFIP, sistema contable) y se quiere marcar como facturada en el sistema.
          </p>
        </div>
        <div className="p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <h4 className="font-bold text-lg mb-2 text-green-600 dark:text-green-400">⚡ Facturar (Automática)</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            Se registra como <code>billingType: "auto"</code>. Pensada para integraciones futuras donde el sistema emita la factura automáticamente.
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-500">
            Ambos tipos mueven la orden al estado <code>facturada</code>.
          </p>
        </div>
      </div>

      <DocAlert type="tip" title="Acciones en lote">
        Desde la vista de tabla podés seleccionar múltiples órdenes y facturarlas o cancelarlas todas juntas usando los botones de la barra de acciones.
      </DocAlert>

      <DocH3>2. Facturada (facturada)</DocH3>
      <DocText>
        La orden fue facturada exitosamente. Desde este estado, la <strong>única acción posible</strong> es generar una Nota de Crédito (<strong>NC</strong>). No se puede volver a <code>pendiente_facturacion</code>.
      </DocText>

      <DocH3>3. Nota de Crédito (nota_credito)</DocH3>
      <DocText>
        Se genera una NC cuando una orden que <strong>ya fue facturada</strong> necesita ser revertida. Esto puede ocurrir en dos casos:
      </DocText>
      <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300 mb-4">
        <li><strong>Manual:</strong> El operador presiona el botón <strong>NC</strong> en una orden facturada (por ejemplo, por un error o reclamo del comprador).</li>
        <li><strong>Automática:</strong> Cuando MercadoLibre envía un webhook de cancelación para una orden que ya estaba en estado <code>facturada</code>, el sistema la mueve automáticamente a <code>nota_credito</code> para mantener la consistencia fiscal.</li>
      </ul>

      <DocH3>4. Venta Cancelada (venta_cancelada)</DocH3>
      <DocText>
        Una orden se mueve a este estado cuando es cancelada <strong>antes de ser facturada</strong>. Puede ocurrir de dos formas:
      </DocText>
      <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300 mb-4">
        <li><strong>Manual:</strong> El operador presiona el botón <strong>Cancelar</strong> (🚫) en una orden pendiente de facturación.</li>
        <li><strong>Automática:</strong> Cuando MercadoLibre envía un webhook de cancelación y la orden aún estaba en <code>pendiente_facturacion</code>.</li>
      </ul>

      <DocAlert type="warning" title="Regla de cancelación fiscal">
        Si una orden ya fue <strong>facturada</strong> y luego se cancela, <strong>no</strong> pasa a <code>venta_cancelada</code>. En su lugar, se genera una <strong>Nota de Crédito</strong> (<code>nota_credito</code>) para mantener la trazabilidad fiscal.
      </DocAlert>

      <DocH3>Diagrama de Transiciones de Ventas</DocH3>
      <div className="my-6 overflow-x-auto">
        <table className="min-w-full text-sm border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <thead className="bg-gray-100 dark:bg-gray-800">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Estado</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Acción / Evento</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700 dark:text-gray-300">Siguiente estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            <tr>
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">pendiente_facturacion</td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">Operador factura (manual o auto)</td>
              <td className="px-4 py-3 text-green-600 dark:text-green-400 font-semibold">facturada ✅</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">pendiente_facturacion</td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">Operador cancela / Webhook cancelación</td>
              <td className="px-4 py-3 text-red-600 dark:text-red-400 font-semibold">venta_cancelada ❌</td>
            </tr>
            <tr>
              <td className="px-4 py-3 text-gray-700 dark:text-gray-300 font-medium">facturada</td>
              <td className="px-4 py-3 text-gray-600 dark:text-gray-400">Operador genera NC / Webhook cancelación</td>
              <td className="px-4 py-3 text-orange-600 dark:text-orange-400 font-semibold">nota_credito 📄</td>
            </tr>
          </tbody>
        </table>
      </div>

      <DocH2 id="data-structure">Estructura de Datos</DocH2>
      <DocCodeBlock
        title="Interfaces Principales"
        code={`
export interface Order {
  id: string;          // ID Interno
  meliOrderId: string; // ID MELI
  
  // Estados
  salesStatus: SalesState;
  logisticsStatus: LogisticsState;
  meliStatus: MeliStatus;

  // Metadata
  tagStatus: "impresas" | "pendientes";
  packaged: boolean;
  tags: string[];      // Tags de MeliLibre (ej: "no_shipping")
}
        `}
      />
    </div>
  );
};
