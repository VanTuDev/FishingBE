import mongoose, { Document, Schema } from 'mongoose';

export interface IAddon extends Document {
  name: string;
  price: number;
  status: 'active' | 'inactive';
  category: 'bait' | 'drink' | 'other';
  description?: string;
}

const AddonSchema = new Schema<IAddon>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
    category: {
      type: String,
      enum: ['bait', 'drink', 'other'],
      required: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IAddon>('Addon', AddonSchema);
