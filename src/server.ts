import { logger } from "@common/logger";

logger.info('nodeist boot ok');
logger.warn({ test: true }, 'This is a test warning.');
logger.error({ test: true }, 'This is a test warning.');