import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Client Interface - Lightweight CRM Model
 * Focused on basic contact management
 */
export interface IClient extends Document {
  tenantId: Types.ObjectId;
  name: string;
  company?: string;
  email: string;
  phone?: string;
  address?: string;
  status: "active" | "inactive" | "lead";
  isFavorite: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const clientSchema = new Schema<IClient>(
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
  },
  { timestamps: true }
);

// Compound unique index: email unique per tenant
clientSchema.index({ tenantId: 1, email: 1 }, { unique: true });

// Text index for search
clientSchema.index({ name: "text", company: "text", email: "text" });

export const Client = mongoose.model<IClient>("Client", clientSchema);
