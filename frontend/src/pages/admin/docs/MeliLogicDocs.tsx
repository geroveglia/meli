import React from "react";
import { DocTitle, DocSubtitle, DocH2, DocH3, DocText, DocCodeBlock, DocAlert } from "../../../components/docs/DocContent";

export const MeliLogicDocs: React.FC = () => {
  return (
    <div>
      <DocTitle>Lógica & Estados de MercadoLibre</DocTitle>
      <DocSubtitle>
        Documentación detallada sobre las máquinas de estado de Logística y Ventas, y cómo se integran con las actualizaciones simuladas de MercadoLibre.
      </DocSubtitle>

      <DocAlert type="warning" title="Información Importante">
        Actualmente, toda la lógica de MercadoLibre es <strong>Simulada (Mocked)</strong> en el frontend a través de <code>lumbaStore.ts</code>. No existe una conexión real con la API de MELI en este entorno de demostración.
      </DocAlert>

      <DocH2 id="state-machines">Máquinas de Estado</DocH2>
      <DocText>
        El sistema maneja tres tipos de estados principales para cada orden, permitiendo un desacoplamiento entre lo que sucede en MercadoLibre y los procesos internos de logística y facturación.
      </DocText>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
        <div className="p-4 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <h4 className="font-bold text-lg mb-2 text-yellow-600 dark:text-yellow-400">1. Meli Status</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400">Estado puro de la plataforma MELI.</p>
          <ul className="mt-3 text-sm list-disc list-inside space-y-1">
            <li>ready_to_ship</li>
            <li>shipped</li>
            <li>delivered</li>
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
            <li>entregado</li>
            <li>cancelado...</li>
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
        El flujo de logística comienza cuando entra una orden pagada.
      </DocText>

      <DocH3>Transiciones Principales</DocH3>
      <DocCodeBlock
        title="frontend/src/stores/lumbaStore.ts"
        code={`
// Ejemplo de transición al imprimir etiqueta
if (status === "impresas") {
  newMeliStatus = "ready_to_ship";
  if (o.packaged) {
    newLogisticsStatus = "listo_para_entregar";
  }
}
        `}
      />

      <DocAlert type="tip" title="Automatización">
        El sistema simula actualizaciones automáticas (via <code>simulateMeliUpdates</code>) donde un 20% de las órdenes avanzan de estado aleatoriamente cada ciertas interacciones, para demostrar la reactividad de la UI.
      </DocAlert>

      <DocH2 id="sales-flow">Flujo de Ventas</DocH2>
      <DocText>
        El flujo de ventas corre en paralelo a la logística. Una orden puede estar despachada pero no facturada, o viceversa (aunque lo ideal es facturar antes de despachar).
      </DocText>
      
      <DocText>
        <strong>Reglas de Negocio:</strong>
      </DocText>
      <ul className="list-disc pl-6 space-y-2 text-gray-700 dark:text-gray-300 mb-6">
        <li>Si una orden se cancela en MELI, el estado de venta pasa a <code>venta_cancelada</code> si no estaba facturada.</li>
        <li>Si ya estaba facturada, pasa a <code>nota_credito</code> para mantener la consistencia fiscal.</li>
        <li>La facturación puede ser <strong>manual</strong> (botón en UI) o <strong>automática</strong> (simulada al despachar).</li>
      </ul>

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
  billingType: "auto" | "manual" | null;
  packaged: boolean;
}
        `}
      />
    </div>
  );
};
