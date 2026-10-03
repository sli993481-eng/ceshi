import { MongoClient, type Db } from "mongodb";

const globalForMongo = globalThis as unknown as {
  _mongoClient?: MongoClient;
  _mongoPromise?: Promise<MongoClient>;
};

export function hasMongoUri() {
  return Boolean(process.env.MONGODB_URI);
}

export async function getClient(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("NO_DB");
  }
  if (globalForMongo._mongoClient) {
    return globalForMongo._mongoClient;
  }
  if (!globalForMongo._mongoPromise) {
    const client = new MongoClient(uri, {
      maxPoolSize: 5,
      serverSelectionTimeoutMS: 8000,
    });
    globalForMongo._mongoPromise = client.connect().then((c) => {
      globalForMongo._mongoClient = c;
      return c;
    });
  }
  return globalForMongo._mongoPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db();
}

export async function pingDb(): Promise<boolean> {
  try {
    if (!hasMongoUri()) return false;
    const db = await getDb();
    await db.command({ ping: 1 });
    await ensureIndexes(db);
    return true;
  } catch {
    return false;
  }
}

export async function ensureIndexes(db: Db) {
  try {
    await Promise.all([
      db.collection("visits").createIndexes([
        { key: { createdAt: -1 } },
        { key: { ip: 1, createdAt: -1 } },
        { key: { fingerprint: 1 } },
        { key: { decision: 1, createdAt: -1 } },
      ]),
      db.collection("ip_rules").createIndexes([
        { key: { type: 1, value: 1 }, unique: true },
      ]),
      db.collection("device_rules").createIndexes([
        { key: { fingerprint: 1 }, unique: true },
      ]),
      db.collection("uploads").createIndexes([
        { key: { createdAt: -1 } },
        { key: { pathname: 1 }, unique: true },
      ]),
      db.collection("audits").createIndexes([{ key: { createdAt: -1 } }]),
      db.collection("rate_buckets").createIndexes([{ key: { key: 1 }, unique: true }]),
    ]);
  } catch {
    // 索引已存在或权限不足时不阻断请求
  }
}
