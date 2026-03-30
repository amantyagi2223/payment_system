import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AppModule } from './app.module';

const REQUEST_BODY_LIMIT = '5000kb'; // 5x default 100kb
const bootstrapLogger = new Logger('Bootstrap');

function isPrismaConnectivityError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  if ('errorCode' in error && error.errorCode === 'P1001') {
    return true;
  }

  const message =
    'message' in error && typeof error.message === 'string'
      ? error.message
      : '';

  return message.includes("Can't reach database server");
}

async function bootstrap() {
  try {
    const app = await NestFactory.create(AppModule);

    app.use(json({ limit: REQUEST_BODY_LIMIT }));
    app.use(urlencoded({ extended: true, limit: REQUEST_BODY_LIMIT }));

    app.use(helmet());
    app.enableCors({
      origin: [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:3001',
        'http://127.0.0.1:3001',
        'http://localhost:3002',
        'http://127.0.0.1:3002',
      ],
      credentials: true,
    });

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    await app.listen(3000);
  } catch (error) {
    if (isPrismaConnectivityError(error)) {
      bootstrapLogger.error(
        'Prisma cannot connect to PostgreSQL (P1001). Ensure DATABASE_URL is correct and PostgreSQL is running before starting the API.',
      );
      process.exit(1);
    }

    if (error instanceof Error) {
      bootstrapLogger.error('Application failed to start.', error.stack);
      process.exit(1);
    }

    bootstrapLogger.error(`Application failed to start: ${String(error)}`);
    process.exit(1);
  }
}
bootstrap();
