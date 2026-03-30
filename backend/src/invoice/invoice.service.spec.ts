import { Test, TestingModule } from '@nestjs/testing';
import { InvoiceService } from './invoice.service';
import { PrismaService } from '../prisma/prisma.service';
import { MerchantService } from '../merchant/merchant.service';
import { BlockchainService } from '../blockchain/blockchain.service';

describe('InvoiceService', () => {
  let service: InvoiceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoiceService,
        {
          provide: PrismaService,
          useValue: {
            customerWallet: { create: jest.fn() },
            invoice: {
              create: jest.fn(),
              findMany: jest.fn(),
              findFirst: jest.fn(),
            },
          },
        },
        {
          provide: MerchantService,
          useValue: {
            getActiveByApiKeyOrThrow: jest.fn(),
          },
        },
        {
          provide: BlockchainService,
          useValue: {
            getActiveNetworkByCodeOrThrow: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InvoiceService>(InvoiceService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
