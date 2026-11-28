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
    await database.command({ ping: 1 });
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
      autoIndex: process.env.NODE_ENV !== 'production',
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
