import React, { useEffect, useState } from "react";

type EnvInfo = {
  nodeEnv: string;
  mongoDbName: string;
  apiUrl: string | null;
};

export const ApiUrlBadge: React.FC = () => {
  const [envInfo, setEnvInfo] = useState<EnvInfo | null>(null);

  useEffect(() => {
    fetch("/api/v1/env")
      .then((res) => res.json())
      .then(setEnvInfo)
      .catch((err) => {
        console.error("Failed to fetch env info:", err);
      });
  }, []);

  if (!envInfo) {
    return <span className="inline-flex flex-col items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent-3 text-accent-7">Cargando entorno...</span>;
  }

  let label = envInfo.apiUrl || "Sin API";
  let ddbb = envInfo.mongoDbName || "Unknown DB";
  let classes = "inline-flex flex-col px-2 py-0.5 rounded-full text-xs font-medium bg-accent-3 text-accent-7";

  try {
    const url = new URL(envInfo.apiUrl || "");
    const host = url.hostname.toLowerCase();

    const isLocal = host === "localhost" || host === "127.0.0.1";
    const isAutolab = host.includes("autolab.fun");

    if (isLocal) {
      label = "Local | Development";
      ddbb = envInfo.mongoDbName;
      classes = "inline-flex flex-col px-2 py-0.5 rounded-full text-xs font-medium bg-accent-9 text-accent-2";
    } else if (isAutolab) {
      label = "Autolab.fun | Production";
      ddbb = envInfo.mongoDbName;
      classes = "inline-flex flex-col items-center px-2 py-0.5 rounded-full text-xs font-medium bg-accent-9 text-accent-2";
    } else {
      label = host;
      ddbb = envInfo.mongoDbName;
    }
  } catch {
    label = envInfo.apiUrl || "Sin API";
    ddbb = envInfo.mongoDbName || "Unknown DB";
  }

  return (
    <span title={envInfo.apiUrl || ""} className={classes}>
      <span>
        <span className="text-accent-5">API : </span>
        {label}
      </span>
      <span>
        <span className="text-accent-5">DDBB : </span>
        {ddbb}
      </span>
    </span>
  );
};
