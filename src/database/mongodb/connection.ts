import { logger } from '@common/logger';
import { config } from '@config/index';
import mongoose from 'mongoose';

mongoose.set('strictQuery', true);

export async function connectMongo(): Promise<void> {
  mongoose.connection.on('connected', () => logger.info('=> MongoDB Connected'));
  mongoose.connection.on('error', (err) => logger.error({ err }, '=> MongoDB Connection error'));
  mongoose.connection.on('disconnected', () => logger.warn('=> MongoDB Disconnected'));

  await mongoose.connect(config.mongo.uri, {
    maxPoolSize: 20,
    minPoolSize: 2,
    serverSelectionTimeoutMS: 10000,
  });
}

export async function disconnectMongo(): Promise<void> {
  await mongoose.disconnect();
}
