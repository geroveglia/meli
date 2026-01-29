import React, { useState } from "react";
import { ServerStatusPill } from "./ServerStatusPill";
import { ApiUrlBadge } from "./ApiUrlBadge";
import { GitBranchBadge } from "./GitBranchBadge";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faChevronDown, faNetworkWired } from "@fortawesome/free-solid-svg-icons";

export const ServerStatusCard: React.FC = () => {
  const [isMinimized, setIsMinimized] = useState(false);

  // Solo mostrar en modo development
  if (!import.meta.env.DEV) {
    return null;
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-5 right-8 z-50 hidden xl:block">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-accent-2/70 shadow-md rounded-full w-10 h-10 flex items-center justify-center border border-accent-4/60 backdrop-blur-sm hover:bg-accent-3 transition-colors"
          title="Mostrar estado del servidor"
        >
          <FontAwesomeIcon icon={faNetworkWired} className="text-accent-6" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-5 right-8 hidden xl:block w-50 z-50">
      <div className="bg-accent-2/70 shadow-md rounded-lg px-3 py-2 border border-accent-4/60 backdrop-blur-sm relative group">
        <button
          onClick={() => setIsMinimized(true)}
          className="absolute -top-3 -right-3 bg-accent-2 rounded-full w-6 h-6 flex items-center justify-center shadow border border-accent-4 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Minimizar"
        >
          <FontAwesomeIcon icon={faChevronDown} className="h-3 w-3 text-accent-6" />
        </button>
        <ApiUrlBadge />
        <div className="mt-2">
          <GitBranchBadge />
        </div>
        <div className="mt-2">
          <ServerStatusPill />
        </div>
      </div>
    </div>
  );
};
