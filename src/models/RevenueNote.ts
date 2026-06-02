import mongoose, { Document, Schema } from 'mongoose';

export interface IRevenueNote extends Document {
  date: string;          // YYYY-MM-DD — ngày áp dụng (do admin chọn)
  label: string;         // mô tả khoản thu/chi
  amount: number;        // số tiền (âm = khoản chi/giảm trừ)
  note: string;          // lý do / ghi chú chi tiết
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RevenueNoteSchema = new Schema<IRevenueNote>(
  {
    date: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
    label: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    note: {
      type: String,
      default: '',
      trim: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IRevenueNote>('RevenueNote', RevenueNoteSchema);
