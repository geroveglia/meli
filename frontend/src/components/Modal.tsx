import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faXmark } from "@fortawesome/free-solid-svg-icons";
import React, { useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string | React.ReactNode;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "fullscreen";
  footer?: React.ReactNode;
  zIndex?: number;
  customHeader?: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, subtitle, children, size = "md", footer, zIndex = 50, customHeader }) => {
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;

    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = originalOverflow;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);
  if (!isOpen) return null;

  const titleId = "modal-title";
  const subtitleId = subtitle ? "modal-subtitle" : undefined;

  const getSizeClasses = () => {
    switch (size) {
      case "sm":
        return "max-w-md";
      case "lg":
        return "max-w-4xl";
      case "xl":
        return "max-w-6xl";
      case "fullscreen":
        return "max-w-[98vw] max-h-svh";
      default:
        return "max-w-2xl";
    }
  };

  const isFullscreen = size === "fullscreen";

  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ zIndex }}>
      <div className={`flex min-h-screen items-center justify-center ${isFullscreen ? "p-2" : "p-4"}`}>
        {/* Backdrop */}
        <div className="fixed inset-0 bg-neutral-950/40 dark:bg-neutral-950/60 backdrop-blur-sm transition duration-200 h-vh h-vh" />

        {/* Panel */}
        <div className={`relative bg-accent-2 border border-accent-4 rounded-2xl shadow-xl w-full ${getSizeClasses()} ${isFullscreen ? "overflow-hidden flex flex-col" : "max-h-[85svh] overflow-y-auto"}`} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={subtitleId}>
          {/* Header */}
          {customHeader ? (
            customHeader
          ) : (
            <div className="flex items-center justify-between p-6 border-b border-accent-4 bg-accent-2 sticky top-0 py-3 z-50">
              <div>
                <h2 id={titleId} className="text-xl font-bold text-accent-1">
                  {title}
                </h2>
                {subtitle &&
                  (typeof subtitle === "string" ? (
                    <p id={subtitleId} className="text-sm text-accent-7 mt-1">
                      {subtitle}
                    </p>
                  ) : (
                    <div id={subtitleId} className="mt-1">
                      {subtitle}
                    </div>
                  ))}
              </div>
              <button onClick={onClose} className="p-2 rounded-lg hover:bg-accent-3" aria-label="Cerrar modal" title="Cerrar">
                <FontAwesomeIcon icon={faXmark} className="h-5 w-5 text-accent-1" />
              </button>
            </div>
          )}

          {/* Content */}
          <div className={isFullscreen ? "flex-1 overflow-hidden" : "p-6"}>{children}</div>

          {/* Footer */}
          {footer && <div className="flex items-center justify-end space-x-3 p-6 border-t border-accent-4 bg-accent-3 sticky bottom-0 py-3 z-50">{footer}</div>}
        </div>
      </div>
    </div>
  );
};
