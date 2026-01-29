import mongoose, { Schema, Document } from "mongoose";

export interface ISeoMetadata extends Document {
  tenantId: mongoose.Types.ObjectId;
  entityType: string;
  entityId: string; // Can be ObjectId or string identifier (like 'home')
  metaTitle?: string;
  metaDescription?: string;
  ogImageUrl?: string;
  noIndex: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const seoMetadataSchema = new Schema<ISeoMetadata>(
  {
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
    entityType: { type: String, required: true, index: true },
    entityId: { type: String, required: true, index: true },
    metaTitle: { type: String, maxlength: 200 }, // Generous limit for DB
    metaDescription: { type: String, maxlength: 500 },
    ogImageUrl: { type: String },
    noIndex: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Compound index for unique lookup per entity within a tenant
seoMetadataSchema.index({ tenantId: 1, entityType: 1, entityId: 1 }, { unique: true });

export const SeoMetadata = mongoose.model<ISeoMetadata>("SeoMetadata", seoMetadataSchema);
