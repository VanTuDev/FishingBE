import mongoose, { Document, Schema } from 'mongoose';

export interface IPackage extends Document {
  code: string;
  name: string;
  duration: number;
  price: number;
  status: 'active' | 'inactive';
  description?: string;
}

const PackageSchema = new Schema<IPackage>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    duration: {
      type: Number,
      required: true,
      min: 0.5,
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
    description: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IPackage>('Package', PackageSchema);
