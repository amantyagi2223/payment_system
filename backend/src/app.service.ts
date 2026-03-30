import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BlockchainService } from './blockchain/blockchain.service';

@Injectable()
export class AppService implements OnModuleInit {
  private readonly logger = new Logger(AppService.name);

  constructor(private readonly blockchainService: BlockchainService) {}

  async onModuleInit() {
    try {
      await this.blockchainService.bootstrapDefaultNetworks();
      this.logger.log('Default blockchain networks bootstrapped');
    } catch (error) {
      this.logger.error(
        `Failed to bootstrap default blockchain networks: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  getHello(): string {
    return 'Hello World!';
  }
}
