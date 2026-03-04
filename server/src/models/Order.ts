import mongoose, { Document, Schema } from "mongoose";

export interface IOrder extends Document {
  tenantId: mongoose.Types.ObjectId;
  clientId?: mongoose.Types.ObjectId; // Reference to "Cuenta"
  sellerId?: number;
  meliId: string;
  packId?: string;
  dateCreated: Date;
  lastUpdated: Date;
  
  buyer: {
    id: number;
    nickname: string;
    firstName?: string;
    lastName?: string;
    billingInfo?: {
      docType: string;
      docNumber: string;
    };
  };

  items: {
    id: string;
    title: string;
    quantity: number;
    unitPrice: number;
    currencyId: string;
  }[];

  payment: {
    total: number;
    currencyId: string;
    status: string;
  };

  shipping: {
    id?: number;
    status: string; // ready_to_ship, shipped, delivered, cancelled
    substatus?: string;
    trackingNumber?: string;
    serviceId?: number;
    receiverAddress?: {
        addressLine: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    }
  };

  // Internal Statuses
  salesStatus: "pendiente_facturacion" | "facturada" | "venta_cancelada" | "nota_credito";
  logisticsStatus: "pendiente_preparacion" | "listo_para_entregar" | "despachado_meli" | "retiro_local" | "acuerdo_vendedor" | "envio_vendedor" | "entregado" | "cancelado_vuelto_stock" | "devolucion_vuelto_stock";
  shippingMode?: string; // me2, me1, custom, not_specified
  pendingDestination?: "retiro_local" | "envio_vendedor";
  
  // Metadata for internal logic
  tags: string[]; // e.g., "impresas"
  tagStatus?: "pendientes" | "impresas" | "error";
  isPackaged: boolean;
  invoiceId?: string;
  invoiceNumber?: number;
}

const orderSchema = new Schema<IOrder>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true, index: true },
    clientId: { type: Schema.Types.ObjectId, ref: "Cuenta", index: true },
    sellerId: { type: Number, index: true }, // MeLi Seller ID for robust mapping
    meliId: { type: String, required: true, unique: true, index: true },
    packId: { type: String },
    dateCreated: { type: Date, required: true },
    lastUpdated: { type: Date, required: true },

    buyer: {
      id: { type: Number, required: true },
      nickname: { type: String },
      firstName: { type: String },
      lastName: { type: String },
      billingInfo: {
        docType: { type: String },
        docNumber: { type: String }
      }
    },

    items: [
      {
        id: String,
        title: String,
        quantity: Number,
        unitPrice: Number,
        currencyId: String,
      },
    ],

    payment: {
      total: { type: Number, required: true },
      currencyId: { type: String, required: true },
      status: { type: String, required: true }, // paid, pending, refund
    },

    shipping: {
      id: Number,
      status: { type: String, default: "pending" },
      substatus: String,
      trackingNumber: String,
      serviceId: Number,
      receiverAddress: {
          addressLine: String,
          city: String,
          state: String,
          zipCode: String,
          country: String
      }
    },

    salesStatus: {
      type: String,
      enum: ["pendiente_facturacion", "facturada", "venta_cancelada", "nota_credito"],
      default: "pendiente_facturacion",
    },

    logisticsStatus: {
      type: String,
      enum: [
        "pendiente_preparacion",
        "listo_para_entregar",
        "despachado_meli",
        "retiro_local",
        "acuerdo_vendedor",
        "envio_vendedor",
        "entregado",
        "cancelado_vuelto_stock",
        "devolucion_vuelto_stock",
      ],
      default: "pendiente_preparacion",
    },
    shippingMode: { type: String },
    pendingDestination: {
      type: String,
      enum: ["retiro_local", "envio_vendedor"],
    },

    tags: [{ type: String }],
    tagStatus: {
      type: String,
      enum: ["pendientes", "impresas", "error"],
      default: "pendientes",
    },
    isPackaged: { type: Boolean, default: false },
    invoiceId: { type: String },
    invoiceNumber: { type: Number },
  },
  { timestamps: true }
);

export const Order = mongoose.model<IOrder>("Order", orderSchema);
