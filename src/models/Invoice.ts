import mongoose, { Document, Schema } from 'mongoose';
import Counter from './Counter';

export interface IAdditionalItem {
  addonId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface IInvoice extends Document {
  billId: string;         // BL-XXXX (human-readable ID)
  customerName: string;
  customerPhone: string;
  packageName?: string;
  packageCode?: string;
  duration?: number;
  quantity?: number;
  additionalItems: IAdditionalItem[];
  totalAmount: number;
  status: 'paid' | 'unpaid';
  isFishingActive: boolean;
  startsAt: string;
  endsAt: string;
  createdBy: mongoose.Types.ObjectId;  // ref User
  checkedOutAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const AdditionalItemSchema = new Schema<IAdditionalItem>(
  {
    addonId: { type: String, required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const InvoiceSchema = new Schema<IInvoice>(
  {
    billId: {
      type: String,
      unique: true,
    },
    customerName: {
      type: String,
      default: 'Khách lẻ',
      trim: true,
    },
    customerPhone: {
      type: String,
      default: '',
      trim: true,
    },
    packageName: { type: String, trim: true },
    packageCode: { type: String, trim: true, uppercase: true },
    duration: { type: Number, min: 0 },
    quantity: { type: Number, min: 1, default: 1 },
    additionalItems: {
      type: [AdditionalItemSchema],
      default: [],
    },
    totalAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['paid', 'unpaid'],
      default: 'unpaid',
    },
    isFishingActive: {
      type: Boolean,
      default: false,
    },
    startsAt: { type: String, required: true },
    endsAt: { type: String, default: 'Đang chạy' },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    checkedOutAt: { type: Date },
  },
  { timestamps: true }
);

// Tự động tạo billId dạng BL-XXXX trước khi lưu lần đầu
InvoiceSchema.pre('save', async function (next) {
  if (this.isNew) {
    const counter = await Counter.findOneAndUpdate(
      { name: 'invoice' },
      { $inc: { seq: 1 } },
      { upsert: true, new: true }
    );
    this.billId = `BL-${counter.seq}`;
  }
  next();
});

export default mongoose.model<IInvoice>('Invoice', InvoiceSchema);
