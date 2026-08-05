import { writeFileSync } from 'fs';
import path from 'path';
import { MongoMemoryServer } from 'mongodb-memory-server';

export const MONGO_URI_FILE = path.join(__dirname, '.mongo-uri');

export default async function globalSetup(): Promise<void> {
  // Downloads the mongod binary on first run, then boots an in-memory MongoDB.
  const mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri('nodist_test');

  // globalSetup and globalTeardown share the same process, so the instance can
  // be stashed on `global`; workers read the URI from the file instead.
  writeFileSync(MONGO_URI_FILE, uri, 'utf8');
  (global as unknown as { __MONGOD__: MongoMemoryServer }).__MONGOD__ = mongod;
}
