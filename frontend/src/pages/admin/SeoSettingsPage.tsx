import React from "react";
import { PageLayout } from "../../components/PageLayout";
import { SeoManagerForm } from "../../components/seo/SeoManagerForm";
import { faSearch } from "@fortawesome/free-solid-svg-icons";

export const SeoSettingsPage: React.FC = () => {
  const [openInfo, setOpenInfo] = React.useState(false);
  return (
    <PageLayout
      title="Gestión SEO"
      subtitle="Optimiza el posicionamiento de tu página principal en buscadores"
      faIcon={{ icon: faSearch }}
      shouldShowInfo={true}
      infoModal={{
        isOpen: openInfo,
        onOpen: () => setOpenInfo(true),
        onClose: () => setOpenInfo(false),
        title: "Ayuda: Gestión SEO",
        content: (
            <p>Configure los metadatos SEO globales para la página de inicio, como título, descripción y palabras clave.</p>
        ),
      }}
    >
      <div className="bg-accent-2 rounded-xl shadow-sm border border-accent-4 p-6">
        <SeoManagerForm 
            entityType="global" 
            entityId="home" 
            defaultTitle="Inicio | Mi Aplicación"
            previewUrl="miaplicacion.com"
        />
      </div>
    </PageLayout>
  );
};
