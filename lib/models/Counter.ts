import mongoose, { Schema, models, Model } from 'mongoose';

interface ICounter {
  _id: string; // e.g. "appRef_2026"
  seq: number;
}

const CounterSchema = new Schema<ICounter>({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter: Model<ICounter> =
  models.Counter || mongoose.model<ICounter>('Counter', CounterSchema);

export default Counter;
