import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle, faClock, faCalendar, faPauseCircle } from "@fortawesome/free-solid-svg-icons";
import { Project } from "../../api/projects";
import { Client } from "../../api/clients";

interface ProjectDetailsProps {
  project: Project;
  client: Client;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case "active":
      return { text: "Activo", classes: "bg-accent-9 text-accent-2", icon: faCheckCircle };
    case "completed":
      return { text: "Completado", classes: "bg-accent-3 text-accent-8", icon: faCheckCircle };
    case "on_hold":
      // Using standard amber for warning if not defined, or fallback to accent
      return { text: "En Espera", classes: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300", icon: faPauseCircle };
    default:
      return { text: status, classes: "bg-accent-3 text-accent-7", icon: faClock };
  }
};

export const ProjectDetails: React.FC<ProjectDetailsProps> = ({ project, client }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-accent-3 rounded-lg">
          <span className="text-xs text-accent-6 uppercase font-semibold">Estado</span>
          <div className="mt-1">
            {(() => {
              const badge = getStatusBadge(project.status);
              return (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.classes}`}>
                  <FontAwesomeIcon icon={badge.icon} className="h-3 w-3" />
                  {badge.text}
                </span>
              );
            })()}
          </div>
        </div>
        <div className="p-3 bg-accent-3 rounded-lg">
          <span className="text-xs text-accent-6 uppercase font-semibold">Cliente</span>
          <p className="mt-1 font-medium text-accent-9">{client.name}</p>
        </div>
      </div>

      <div className="p-3 bg-accent-3 rounded-lg">
        <span className="text-xs text-accent-6 uppercase font-semibold">Descripción</span>
        <p className="mt-1 text-sm text-accent-8">
          {project.description || <span className="italic text-accent-5">Sin descripción</span>}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="p-3 bg-accent-3 rounded-lg">
          <span className="text-xs text-accent-6 uppercase font-semibold">Inicio</span>
          <div className="mt-1 flex items-center gap-2 text-sm text-accent-8">
            <FontAwesomeIcon icon={faCalendar} className="text-accent-5" />
            {project.startDate ? new Date(project.startDate).toLocaleDateString() : "-"}
          </div>
        </div>
        <div className="p-3 bg-accent-3 rounded-lg">
          <span className="text-xs text-accent-6 uppercase font-semibold">Fin</span>
          <div className="mt-1 flex items-center gap-2 text-sm text-accent-8">
            <FontAwesomeIcon icon={faCalendar} className="text-accent-5" />
            {project.endDate ? new Date(project.endDate).toLocaleDateString() : "-"}
          </div>
        </div>
      </div>
    </div>
  );
};
