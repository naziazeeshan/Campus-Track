
import 'dotenv/config';
import mongoose from 'mongoose';
export default async function connectDB() {
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is missing in server/.env');
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is missing in server/.env');
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
}
