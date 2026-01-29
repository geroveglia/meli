import { Schema, model, type Document, Types } from "mongoose";

export interface ICarouselImage extends Document {
  title?: string;
  imageUrl: string;
  order: number;
  isActive: boolean;
  tenantId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const carouselImageSchema = new Schema<ICarouselImage>(
  {
    title: { type: String, trim: true },
    imageUrl: { type: String, required: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    tenantId: { type: Schema.Types.ObjectId, ref: "Tenant", required: true },
  },
  { timestamps: true }
);

carouselImageSchema.index({ tenantId: 1, order: 1 });

export const CarouselImage = model<ICarouselImage>("CarouselImage", carouselImageSchema);
