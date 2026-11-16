import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

interface CachedConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var mongoose: CachedConnection | undefined;
}

const cached: CachedConnection = global.mongoose || {
  conn: null,
  promise: null,
};

if (!global.mongoose) {
  global.mongoose = cached;
}

const HEARTBEAT_INTERVAL_MS = 60 * 60 * 1000;
let lastHeartbeatAttemptAt = 0;

async function keepMongoActive(connection: typeof mongoose) {
  const now = Date.now();
  if (now - lastHeartbeatAttemptAt < HEARTBEAT_INTERVAL_MS) return;
  lastHeartbeatAttemptAt = now;

  const database = connection.connection.db;
  if (!database) {
    console.error('MongoDB keepalive skipped: connection is not ready.');
    return;
  }

  try {
    const collection = database.collection<{
      _id: string;
      checkedAt: Date;
      nonce: string;
    }>('system_maintenance');
    await collection.updateOne(
      { _id: 'cluster-keepalive' },
      { $set: { checkedAt: new Date(), nonce: randomUUID() } },
      { upsert: true },
    );

    const heartbeat = await collection.findOne({ _id: 'cluster-keepalive' });
    if (!heartbeat) throw new Error('Keepalive record could not be read back.');
  } catch (error) {
    console.error('MongoDB keepalive failed:', error);
  }
}

async function connectDB() {
  if (cached.conn) {
    await keepMongoActive(cached.conn);
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts);
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  await keepMongoActive(cached.conn);
  return cached.conn;
}

export default connectDB;
