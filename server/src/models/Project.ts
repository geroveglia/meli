import mongoose, { Document, Schema, Types } from "mongoose";

/**
 * Project Interface
 * Manage projects associated with a specific client
 */
export interface IProject extends Document {
  tenantId: Types.ObjectId;
  clientId: Types.ObjectId;
  name: string;
  description?: string;
  status: "active" | "completed" | "on_hold";
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    tenantId: {
      type: Schema.Types.ObjectId,
      ref: "Tenant",
      required: true,
      index: true,
    },
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
    },
    description: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "completed", "on_hold"],
      default: "active",
      index: true,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
  },
  { timestamps: true }
);

// Compound unique index: project name unique per client
projectSchema.index({ clientId: 1, name: 1 }, { unique: true });

export const Project = mongoose.model<IProject>("Project", projectSchema);
