import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    const maxRetries = Number.parseInt(
      process.env.PRISMA_CONNECT_MAX_RETRIES ?? '10',
      10,
    );
    const retryDelayMs = Number.parseInt(
      process.env.PRISMA_CONNECT_RETRY_DELAY_MS ?? '2000',
      10,
    );

    for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
      try {
        await this.$connect();
        if (attempt > 1) {
          this.logger.log(
            `Connected to database on attempt ${attempt}/${maxRetries}.`,
          );
        }
        return;
      } catch (error) {
        const prismaCode =
          error &&
          typeof error === 'object' &&
          'errorCode' in error &&
          typeof error.errorCode === 'string'
            ? error.errorCode
            : undefined;

        const isRetryable = prismaCode === 'P1001';
        const canRetry = isRetryable && attempt < maxRetries;

        if (!canRetry) {
          throw error;
        }

        this.logger.warn(
          `Database is not reachable yet (attempt ${attempt}/${maxRetries}, code ${prismaCode}). Retrying in ${retryDelayMs}ms...`,
        );
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
