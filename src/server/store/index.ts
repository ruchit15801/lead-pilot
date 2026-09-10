import mongoose from "mongoose";

const globalMongoose = global as unknown as {
  mongoose: {
    conn: mongoose.Connection | null;
    promise: Promise<mongoose.Connection> | null;
  };
};

if (!globalMongoose.mongoose) {
  globalMongoose.mongoose = { conn: null, promise: null };
}

let driver: "file" | "mongo" = "file";
let lastError: string | undefined;

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    driver = "file";
    return { driver, ok: true };
  }

  if (globalMongoose.mongoose.conn) {
    driver = "mongo";
    return { driver, ok: true };
  }

  if (!globalMongoose.mongoose.promise) {
    mongoose.set("strictQuery", true);
    globalMongoose.mongoose.promise = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 4000 })
      .then((m) => m.connection)
      .catch((err) => {
        globalMongoose.mongoose.promise = null;
        throw err;
      });
  }

  try {
    globalMongoose.mongoose.conn = await globalMongoose.mongoose.promise;
    driver = "mongo";
    lastError = undefined;
    return { driver, ok: true };
  } catch (error) {
    lastError = error instanceof Error ? error.message : "MongoDB connection failed";
    driver = "file";
    return { driver, ok: false, error: lastError };
  }
}

export function databaseHealth() {
  return {
    ok: driver === "file" || (globalMongoose.mongoose.conn?.readyState === 1),
    driver,
    error: lastError,
  };
}

export const DbSnapshotSchema = new mongoose.Schema({
  data: { type: mongoose.Schema.Types.Mixed, required: true },
});

export const DbSnapshot = mongoose.models.DbSnapshot || mongoose.model("DbSnapshot", DbSnapshotSchema);

export async function getMongoSnapshot() {
  const { ok } = await connectDatabase();
  if (!ok) return null;
  const doc = await DbSnapshot.findOne().lean();
  return doc ? doc.data : null;
}

export async function saveMongoSnapshot(data: any) {
  const { ok } = await connectDatabase();
  if (!ok) return false;
  await DbSnapshot.updateOne({}, { data }, { upsert: true });
  return true;
}
