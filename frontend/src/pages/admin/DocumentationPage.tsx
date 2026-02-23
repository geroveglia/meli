import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { DocsLayout } from "../../components/docs/DocsLayout";
import { MeliLogicDocs } from "./docs/MeliLogicDocs";
import { ProjectStructureDocs } from "./docs/ProjectStructureDocs";
import { WebhookRecoveryDocs } from "./docs/WebhookRecoveryDocs";
import { MeliAuthDocs } from "./docs/MeliAuthDocs";
import { DocTitle, DocSubtitle, DocText, DocH2, DocAlert } from "../../components/docs/DocContent";
import { Link } from "react-router-dom";

const DocsHome: React.FC = () => (
  <div>
    <DocTitle>Documentación del Desarrollador</DocTitle>
    <DocSubtitle>
      Bienvenido a la documentación técnica del proyecto. Aquí encontrarás guías sobre la arquitectura, la lógica de negocio y los componentes principales.
    </DocSubtitle>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
      <Link to="/admin/doc/meli-logic" className="block p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:shadow-md transition-all group">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-500 mb-2">
          MercadoLibre Logic
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Entiende los flujos de logística, ventas y las máquinas de estado que gobiernan las órdenes.
        </p>
      </Link>
      
      <Link to="/admin/doc/structure" className="block p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:shadow-md transition-all group">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-500 mb-2">
          Estructura del Proyecto
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Explora la arquitectura Frontend/Backend, dependencias y organización del código.
        </p>
      </Link>

      <Link to="/admin/doc/webhook-recovery" className="block p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:shadow-md transition-all group">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-500 mb-2">
          Recuperación de Webhooks
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Cómo el sistema recupera ventas y actualizaciones perdidas cuando el servidor está caído.
        </p>
      </Link>

      <Link to="/admin/doc/meli-auth" className="block p-6 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-500 hover:shadow-md transition-all group">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-500 mb-2">
          Autenticación ML & OAuth
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Guía sobre Redirect URIs, conexión HTTPS con Ngrok, y multicuentas.
        </p>
      </Link>
    </div>

    <DocH2>Primeros Pasos</DocH2>
    <DocText>
      Selecciona una sección del menú lateral para comenzar a explorar la documentación. Esta sección está construida utilizando componentes reutilizables inspirados en bibliotecas de documentación modernas.
    </DocText>
    
    <DocAlert type="tip">
      Esta documentación vive dentro del mismo proyecto, lo que facilita mantenerla actualizada junto con el código.
    </DocAlert>
  </div>
);

export const DocumentationPage: React.FC = () => {
  return (
    <DocsLayout>
      <Routes>
        <Route index element={<DocsHome />} />
        <Route path="meli-logic" element={<MeliLogicDocs />} />
        <Route path="structure" element={<ProjectStructureDocs />} />
        <Route path="webhook-recovery" element={<WebhookRecoveryDocs />} />
        <Route path="meli-auth" element={<MeliAuthDocs />} />
        <Route path="*" element={<Navigate to="/admin/doc" replace />} />
      </Routes>
    </DocsLayout>
  );
};
