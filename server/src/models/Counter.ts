import mongoose, { Document, Schema } from 'mongoose';

export interface ICounter extends Document<string> {
  _id: string; 
  sequenceValue: number;
}

const counterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  sequenceValue: { type: Number, default: 0 }
});

export const Counter = mongoose.model<ICounter>('Counter', counterSchema);
