import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Cuenta Interface - Lightweight CRM Model
 * Focused on basic contact management
 */
export interface ICuenta extends Document {
  tenantId: Types.ObjectId;
  name: string;
  slug?: string;
  company?: string;
  email: string;
  phone?: string;
  address?: string;
  status: "active" | "inactive" | "lead";
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
  usuarios?: { userId: Types.ObjectId; permiso: "ver" | "editar" }[];
  ownerUserId?: Types.ObjectId;
  clienteId?: Types.ObjectId;
  mercadolibre?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    userId: string;
    nickname: string;
    sellerId: number;
  };
  rotsisConfig?: {
    tipo_comprobante: string;
    codigo_vendedor: string;
    codigo_sucursal: string;
    codigo_lista_precios: string;
  };
}

const cuentaSchema = new Schema<ICuenta>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
    },
    slug: {
      type: String,
      trim: true,
    },
    company: {
      type: String,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive", "lead"],
      default: "active",
      index: true,
    },
    isFavorite: {
      type: Boolean,
      default: false,
      index: true,
    },
    mercadolibre: {
      accessToken: String,
      refreshToken: String,
      expiresAt: Number,
      userId: String,
      nickname: String,
      sellerId: Number,
    },
    usuarios: [
      {
        userId: { type: Schema.Types.ObjectId, ref: "User" },
        permiso: { type: String, enum: ["ver", "editar"], default: "ver" },
      },
    ],
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User" },
    clienteId: { type: Schema.Types.ObjectId, ref: "Client" },
    rotsisConfig: {
      tipo_comprobante: { type: String, default: "1" },
      codigo_vendedor: { type: String, default: "ML" },
      codigo_sucursal: { type: String, default: "0" },
      codigo_lista_precios: { type: String, default: "1" },
    }
  },
  { timestamps: true, collection: "cuentas" }
);

// Compound unique index: email unique per tenant
cuentaSchema.index({ tenantId: 1, email: 1 }, { unique: true });

// Text index for search
cuentaSchema.index({ name: "text", company: "text", email: "text" });

export const Cuenta = mongoose.model<ICuenta>("Cuenta", cuentaSchema);
