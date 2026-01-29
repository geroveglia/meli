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
    bgClass: "bg-accent-3",
    textClass: "text-accent-7",
  },
  preaprobado: {
    icon: faCheck,
    prefix: null,
    label: "Preaprobado",
    bgClass: "bg-accent-3",
    textClass: "text-accent-7",
  },
  aprobado: {
    icon: faCheckCircle,
    prefix: null,
    label: "Aprobado",
    bgClass: "bg-accent-9",
    textClass: "text-accent-2",
  },
  rechazado: {
    icon: faTimesCircle,
    prefix: null,
    label: "Rechazado",
    bgClass: "bg-accent-3",
    textClass: "text-accent-7",
  },
  entregado: {
    icon: faTruck,
    prefix: null,
    label: "Entregado",
    bgClass: "bg-accent-9",
    textClass: "text-accent-2",
  },
  cancelado: {
    icon: faBan,
    prefix: null,
    label: "Cancelado",
    bgClass: "bg-accent-3",
    textClass: "text-accent-7",
  },
  doc_pendiente: {
    icon: faFile,
    prefix: "Doc.",
    label: "Pendiente",
    bgClass: "bg-accent-3",
    textClass: "text-accent-7",
    borderClass: "",
  },
  doc_subido: {
    icon: faUpload,
    prefix: "Doc.",
    label: "Subido",
    bgClass: "bg-accent-9",
    textClass: "text-accent-2",
  },
  doc_vencido: {
    icon: faExclamationTriangle,
    prefix: "Doc.",
    label: "Vencido",
    bgClass: "bg-accent-4",
    textClass: "text-accent-1",
  },
  firma_pendiente: {
    icon: faPenToSquare,
    prefix: "Firma",
    label: "Pendiente",
    bgClass: "bg-accent-3",
    textClass: "text-accent-7",
  },
  firma_enviado_a_firmar: {
    icon: faPaperPlane,
    prefix: "Firma",
    label: "Enviada",
    bgClass: "bg-accent-9",
    textClass: "text-accent-2",
  },
  firma_firmado: {
    icon: faCheck,
    prefix: "Firma",
    label: "Firmado",
    bgClass: "bg-accent-9",
    textClass: "text-accent-2",
  },
  vacaciones_pendiente: {
    icon: faClock,
    prefix: null,
    label: "Pendiente",
    bgClass: "bg-accent-3",
    textClass: "text-accent-7",
  },
  vacaciones_preaprobada: {
    icon: faCheck,
    prefix: null,
    label: "Preaprobada",
    bgClass: "bg-accent-3",
    textClass: "text-accent-7",
  },
  vacaciones_aprobada: {
    icon: faCheckCircle,
    prefix: null,
    label: "Aprobada",
    bgClass: "bg-accent-9",
    textClass: "text-accent-2",
  },
  vacaciones_rechazada: {
    icon: faTimesCircle,
    prefix: null,
    label: "Rechazada",
    bgClass: "bg-accent-3",
    textClass: "text-accent-7",
  },
  vacaciones_entregada: {
    icon: faTruck,
    prefix: null,
    label: "Entregada",
    bgClass: "bg-accent-9",
    textClass: "text-accent-2",
  },
  vacaciones_cancelada: {
    icon: faBan,
    prefix: null,
    label: "Cancelada",
    bgClass: "bg-accent-3",
    textClass: "text-accent-7",
  },
};
