import { faCheck, faClock, faUpload, faFile, faExclamationTriangle, faCheckCircle, faTruck, faBan, faTimesCircle, faPenToSquare, faPaperPlane } from "@fortawesome/free-solid-svg-icons";
import { IconDefinition } from "@fortawesome/fontawesome-svg-core";

export type StatusType = "pendiente" | "preaprobado" | "aprobado" | "rechazado" | "entregado" | "cancelado" | "doc_pendiente" | "doc_subido" | "doc_vencido" | "firma_pendiente" | "firma_enviado_a_firmar" | "firma_firmado" | "vacaciones_pendiente" | "vacaciones_preaprobada" | "vacaciones_aprobada" | "vacaciones_rechazada" | "vacaciones_entregada" | "vacaciones_cancelada";

export interface StatusConfig {
  icon: IconDefinition;
  prefix: string | null;
  label: string;
  bgClass: string;
  textClass: string;
  borderClass?: string;
}

export const STATUS_CONFIG: Record<StatusType, StatusConfig> = {
  pendiente: {
    icon: faClock,
    prefix: null,
    label: "Pendiente",
    bgClass: "bg-gray-800 dark:bg-gray-700",
    textClass: "text-white dark:text-gray-100",
  },
  preaprobado: {
    icon: faCheck,
    prefix: null,
    label: "Preaprobado",
    bgClass: "bg-gray-800 dark:bg-gray-700",
    textClass: "text-white dark:text-gray-100",
  },
  aprobado: {
    icon: faCheckCircle,
    prefix: null,
    label: "Aprobado",
    bgClass: "bg-gray-800 dark:bg-gray-700",
    textClass: "text-white dark:text-gray-100",
  },
  rechazado: {
    icon: faTimesCircle,
    prefix: null,
    label: "Rechazado",
    bgClass: "bg-gray-800 dark:bg-gray-700",
    textClass: "text-white dark:text-gray-100",
  },
  entregado: {
    icon: faTruck,
    prefix: null,
    label: "Entregado",
    bgClass: "bg-gray-800 dark:bg-gray-700",
    textClass: "text-white dark:text-gray-100",
  },
  cancelado: {
    icon: faBan,
    prefix: null,
    label: "Cancelado",
    bgClass: "bg-gray-800 dark:bg-gray-700",
    textClass: "text-white dark:text-gray-100",
  },
  doc_pendiente: {
    icon: faFile,
    prefix: "Doc.",
    label: "Pendiente",
    bgClass: "bg-gray-800 dark:bg-gray-700",
    textClass: "text-white dark:text-gray-100",
    borderClass: "",
  },
  doc_subido: {
    icon: faUpload,
    prefix: "Doc.",
    label: "Subido",
    bgClass: "bg-gray-800 dark:bg-gray-700",
    textClass: "text-white dark:text-gray-100",
  },
  doc_vencido: {
    icon: faExclamationTriangle,
    prefix: "Doc.",
    label: "Vencido",
    bgClass: "bg-gray-800 dark:bg-gray-700",
    textClass: "text-white dark:text-gray-100",
  },
  firma_pendiente: {
    icon: faPenToSquare,
    prefix: "Firma",
    label: "Pendiente",
    bgClass: "bg-gray-800 dark:bg-gray-700",
    textClass: "text-white dark:text-gray-100",
  },
  firma_enviado_a_firmar: {
    icon: faPaperPlane,
    prefix: "Firma",
    label: "Enviada",
    bgClass: "bg-gray-800 dark:bg-gray-700",
    textClass: "text-white dark:text-gray-100",
  },
  firma_firmado: {
    icon: faCheck,
    prefix: "Firma",
    label: "Firmado",
    bgClass: "bg-gray-800 dark:bg-gray-700",
    textClass: "text-white dark:text-gray-100",
  },
  vacaciones_pendiente: {
    icon: faClock,
    prefix: null,
    label: "Pendiente",
    bgClass: "bg-gray-800 dark:bg-gray-700",
    textClass: "text-white dark:text-gray-100",
  },
  vacaciones_preaprobada: {
    icon: faCheck,
    prefix: null,
    label: "Preaprobada",
    bgClass: "bg-gray-800 dark:bg-gray-700",
    textClass: "text-white dark:text-gray-100",
  },
  vacaciones_aprobada: {
    icon: faCheckCircle,
    prefix: null,
    label: "Aprobada",
    bgClass: "bg-gray-800 dark:bg-gray-700",
    textClass: "text-white dark:text-gray-100",
  },
  vacaciones_rechazada: {
    icon: faTimesCircle,
    prefix: null,
    label: "Rechazada",
    bgClass: "bg-gray-800 dark:bg-gray-700",
    textClass: "text-white dark:text-gray-100",
  },
  vacaciones_entregada: {
    icon: faTruck,
    prefix: null,
    label: "Entregada",
    bgClass: "bg-gray-800 dark:bg-gray-700",
    textClass: "text-white dark:text-gray-100",
  },
  vacaciones_cancelada: {
    icon: faBan,
    prefix: null,
    label: "Cancelada",
    bgClass: "bg-gray-800 dark:bg-gray-700",
    textClass: "text-white dark:text-gray-100",
  },
};
