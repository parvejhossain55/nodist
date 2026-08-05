import { unlinkSync } from 'fs';
import { MONGO_URI_FILE } from './globalSetup';

export default async function globalTeardown(): Promise<void> {
  const mongod = (global as unknown as { __MONGOD__?: { stop(): Promise<void> } }).__MONGOD__;
  if (mongod) await mongod.stop();

  try {
    unlinkSync(MONGO_URI_FILE);
  } catch {
    // already gone — fine
  }
}
