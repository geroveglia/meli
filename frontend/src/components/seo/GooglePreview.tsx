import React from "react";

interface GooglePreviewProps {
  title?: string;
  description?: string;
  url?: string; // Host/path simulation
}

export const GooglePreview: React.FC<GooglePreviewProps> = ({
  title,
  description,
  url = "tusitio.com",
}) => {
  // Truncation helpers (visual only as CSS handles clamp usually, but for count we check elsewhere)
  // Google typically truncates titles around 600px (~60 chars) and desc around 160 chars.
  
  const displayTitle = title || "Título de la Página | Tu Sitio";
  const displayDesc = description || "Esta es una descripción de ejemplo que aparecerá en los resultados de búsqueda de Google. Escribe una descripción atractiva para mejorar tu CTR.";

  return (
    <div className="font-sans antialiased max-w-[600px] p-4 bg-white rounded-lg border border-gray-100 shadow-sm select-none">
      {/* URL Line */}
      <div className="flex items-center gap-2 mb-1 group cursor-pointer">
        <div className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-xs text-gray-500 uppercase overflow-hidden">
          <img 
             src={`https://www.google.com/s2/favicons?domain=example.com&sz=64`} 
             alt="favicon"
             onError={(e) => (e.currentTarget.style.display = 'none')}
             className="w-4 h-4"
          />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-[14px] text-[#202124] group-hover:underline truncate">
            {url}
          </span>
          {/* <span className="text-[12px] text-[#5f6368] pt-[1px]">https://{url}</span> */}
        </div>
        <div className="ml-auto">
             <div className="text-gray-400">
                <svg focusable="false" viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"></path></svg>
             </div>
        </div>
      </div>

      {/* Title */}
      <h3 className="text-[20px] text-[#1a0dab] hover:underline cursor-pointer leading-[1.3] mb-1 line-clamp-1 break-words">
        {displayTitle}
      </h3>

      {/* Description */}
      <div className="text-[14px] text-[#4d5156] leading-[1.58] line-clamp-2">
        {displayDesc}
      </div>
    </div>
  );
};
