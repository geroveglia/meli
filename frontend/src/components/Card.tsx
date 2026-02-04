import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";

import { getImageUrl } from "../utils/imageHelpers";

interface CardAction {
  icon: IconDefinition;
  onClick: (e: React.MouseEvent) => void;
  title: string;
  variant?: "default" | "blue" | "success" | "warning" | "danger";
  disabled?: boolean;
}

interface CardBadge {
  text: string;
  variant?: "default" | "success" | "warning" | "blue" | "info" | "green" | "social" | "cyan";
  icon?: IconDefinition;
  className?: string;
}

interface CardAvatar {
  src?: string;
  fallback: string;
  alt?: string;
}

/** Breadcrumbs */
type CrumbProps = {
  icon?: IconDefinition;
  text?: string;
  variant?: "gray" | "blue";
};

type BreadcrumbsProps = {
  first?: CrumbProps;
  second?: CrumbProps;
  /** ⭐ NUEVO: contenido libre */
  content?: React.ReactNode;
};

interface CardHeaderProps {
  title: string | React.ReactNode;
  subtitle?: string;
  icon?: IconDefinition;
  avatar?: CardAvatar;
  badges?: CardBadge[];
  breadcrumbs?: BreadcrumbsProps;
}

interface CardFooterProps {
  leftContent?: React.ReactNode;
  actions?: CardAction[];
}

interface CardProps {
  header?: CardHeaderProps;
  children?: React.ReactNode;
  footer?: CardFooterProps;
  onClick?: () => void;
  className?: string;
  variant?: "default" | "create" | "highlight";
}

export const Card: React.FC<CardProps> = ({ header, children, footer, onClick, className = "", variant = "default" }) => {
  const getVariantClasses = () => {
    switch (variant) {
      case "create":
        return "border-2 border-dashed border-accent-4 hover:border-accent-9";
      case "highlight":
        return "ring-2 ring-primary-500 dark:ring-primary-400";
      default:
        return "shadow-sm hover:shadow-md";
    }
  };

  const getBadgeClasses = () => {
    return "bg-gray-800 text-white dark:bg-gray-700 dark:text-gray-100";
  };

  const getActionClasses = (actionVariant: string = "default") => {
    // Base classes for minimalist icons
    const base = "text-accent-5 transition-colors";
    
    switch (actionVariant) {
      case "blue":
        return `${base} hover:!text-blue-600 dark:text-gray-500 dark:hover:!text-blue-400`;
      case "success":
        return `${base} hover:!text-green-600 dark:text-gray-500 dark:hover:!text-green-400`;
      case "warning":
        return `${base} hover:!text-orange-600 dark:text-gray-500 dark:hover:!text-orange-400`;
      case "danger":
        return `${base} hover:!text-red-600 dark:text-gray-500 dark:hover:!text-red-400`;
      default:
        return `${base} hover:!text-accent-9 dark:text-gray-500 dark:hover:!text-blue-400`;
    }
  };

  const renderCrumb = (c: CrumbProps, position: "first" | "second") => {
    const variant = c.variant ?? (position === "first" ? "gray" : "blue");

    const wrap = variant === "blue" ? "flex items-center space-x-2 border-b pb-2 border-neutral-700" : "flex items-center space-x-2 pt-1 border-neutral-700";

    const dot = "w-5 h-5 flex items-center justify-center";
    const textCls = "text-xs font-medium truncate";

    const fallbackText = position === "first" ? "Proyecto" : "Campaña";

    return (
      <div className={wrap}>
         <div className={dot}>{c.icon ? <FontAwesomeIcon icon={c.icon} className="h-2.5 w-2.5 text-accent-1" /> : <span className="text-[10px] leading-none text-white font-semibold">{(c.text || fallbackText).charAt(0).toUpperCase()}</span>}</div>
        <span className={textCls}>{c.text || fallbackText}</span>
      </div>
    );
  };

  /** ⭐ Breadcrumb mejorado con support para content */
  const renderBreadcrumbs = () => {
    const crumbs = header?.breadcrumbs;
    if (!crumbs) return null;

    // ⭐ Si trae contenido custom
    if (crumbs.content) {
      return <div className="mt-2">{crumbs.content}</div>;
    }

    // ⭐ Si usa sistema tradicional
    if (!crumbs.first && !crumbs.second) return null;

    return (
      <div className="mt-2">
        <div className="flex space-y-2">
          {crumbs.first && renderCrumb(crumbs.first, "first")}
          {crumbs.second && renderCrumb(crumbs.second, "second")}
        </div>
      </div>
    );
  };

  return (
    <div className={`bg-accent-3 border border-accent-4 rounded-xl transition-all duration-200 overflow-hidden min-h-[25svh] ${getVariantClasses()} ${onClick ? "cursor-pointer hover:scale-[1.01] hover:shadow-lg" : ""} ${className} h-full flex flex-col`} onClick={onClick}>
      <div className="p-4 flex-1 flex flex-col gap-3">
        <div className="flex flex-col gap-2 h-full">
          {header && (
            <div className="h-full flex flex-col">
              {/* Badges */}
              <div className="flex items-center space-x-2">
                <div className="flex flex-wrap gap-2 w-full justify-between">
                  {header.badges?.map((badge, index) => (
                    <span key={index} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shadow-sm ${badge.className || getBadgeClasses()}`}>
                      {badge.icon && <FontAwesomeIcon icon={badge.icon} className="h-3 w-3" />}
                      <span className="text-nowrap">{badge.text}</span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Breadcrumbs */}
              {renderBreadcrumbs()}
              {/* Avatar / Icon + Title */}
              <div className="flex space-x-3 flex-1 min-w-0 mt-4">
                {header.avatar && (
                  <div className="w-10 h-10 flex-shrink-0">
                    {header.avatar.src ? (
                      <img src={getImageUrl(header.avatar.src)} alt={header.avatar.alt || (typeof header.title === "string" ? header.title : "")} className="w-full h-full object-cover rounded-full border-2 border-neutral-200 dark:border-neutral-700" />
                    ) : (
                      <div className="w-full h-full bg-primary-950 dark:bg-primary-50 flex items-center justify-center">
                        <span className="text-white dark:text-primary-950 font-bold text-sm">{header.avatar.fallback}</span>
                      </div>
                    )}
                  </div>
                )}

                {header.icon && !header.avatar && (
                  <div className="flex-shrink-0">
                    <FontAwesomeIcon icon={header.icon} className="h-5 w-5 text-accent-1" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-accent-1 text-sm truncate">{header.title}</h3>
                  {header.subtitle && <p className="text-xs text-accent-7 truncate">{header.subtitle}</p>}
                </div>
              </div>
            </div>
          )}

          {/* Content */}
          {children && <div className="space-y-3 mt-2">{children}</div>}
        </div>
      </div>

      {/* Footer */}
      {footer && (footer.leftContent || footer.actions?.length) && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-accent-4">
          <div className="flex-1">{footer.leftContent}</div>

          {footer.actions?.length ? (
            <div className="flex items-center space-x-2">
              {footer.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    action.onClick(e);
                  }}
                  disabled={action.disabled}
                  className={`p-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${getActionClasses(action.variant)}`}
                  title={action.title}
                >
                  <FontAwesomeIcon icon={action.icon} className="h-4 w-4" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
