import React from "react";
import { DocTitle, DocSubtitle, DocH2, DocText, DocCodeBlock, DocAlert } from "../../../components/docs/DocContent";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faReact, faNodeJs, faDocker } from "@fortawesome/free-brands-svg-icons";

export const ProjectStructureDocs: React.FC = () => {
  return (
    <div>
      <DocTitle>Estructura del Proyecto</DocTitle>
      <DocSubtitle>
        Visión general de la arquitectura full-stack, tecnologías clave y organización de carpetas.
      </DocSubtitle>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="flex items-center gap-4 p-6 rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
          <FontAwesomeIcon icon={faReact} className="text-4xl text-blue-500" />
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Frontend</h3>
            <p className="text-sm text-gray-500">React + Vite + Tailwind</p>
          </div>
        </div>
         <div className="flex items-center gap-4 p-6 rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
          <FontAwesomeIcon icon={faNodeJs} className="text-4xl text-green-500" />
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Backend</h3>
            <p className="text-sm text-gray-500">Node + Express + TS</p>
          </div>
        </div>
         <div className="flex items-center gap-4 p-6 rounded-xl bg-white dark:bg-gray-800 shadow-sm border border-gray-200 dark:border-gray-700">
          <FontAwesomeIcon icon={faDocker} className="text-4xl text-blue-600" />
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Infra</h3>
            <p className="text-sm text-gray-500">WAMP / Docker Ready</p>
          </div>
        </div>
      </div>

      <DocH2 id="frontend-architecture">Arquitectura Frontend</DocH2>
      <DocText>
        El frontend utiliza una arquitectura basada en <strong>Stores de Zustand</strong> para el manejo de estado global, separando la lógica de negocio de los componentes de UI.
      </DocText>

      <DocCodeBlock
        title="Tech Stack"
        code={`
dependencies: {
  "react": "^18.2.0",
  "zustand": "^4.5.0",  // State Management
  "tailwindcss": "^3.4.1", // Styling
  "framer-motion": "^10.0.0", // Animations
  "react-router-dom": "^6.21.0" // Routing
}
        `}
      />

      <DocH2 id="folder-structure">Estructura de Carpetas (Frontend)</DocH2>
      <DocCodeBlock
        language="text"
        code={`
src/
├── api/            # Configuración de Axios e interceptors
├── components/     # UI Components reutilizables
│   ├── docs/       # Componentes de documentación (Nuevo)
│   ├── lumba/      # Componentes específicos de MELI
│   └── ...
├── pages/          # Vistas principales (Routed)
│   ├── admin/      # Páginas del panel de administración
│   ├── lumba/      # Páginas de Logística y Ventas
│   └── ...
├── stores/         # Estados globales (Zustand)
│   ├── authStore.ts   # Autenticación y usuario
│   ├── lumbaStore.ts  # Lógica MELI (Orders, Mocks)
│   └── ...
└── utils/          # Helpers y utilidades
        `}
      />

      <DocAlert type="info" title="Lumba Store">
        El archivo <code>src/stores/lumbaStore.ts</code> es el corazón de la demo de MercadoLibre. Contiene tanto la definición del estado como la generación de datos de prueba (mocks).
      </DocAlert>

      <DocH2 id="backend-overview">Backend Overview</DocH2>
      <DocText>
        El backend es una API RESTful construida con Express. Soporta multi-tenancy y conexión dual a bases de datos (MySQL y MongoDB) mediante una capa de abstracción de repositorios (aunque actualmente se prioriza MySQL con Sequelize/Prisma style logic).
      </DocText>
    </div>
  );
};
