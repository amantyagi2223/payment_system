import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { MerchantService } from './merchant.service';
import { PrismaService } from '../prisma/prisma.service';

describe('MerchantService', () => {
  let service: MerchantService;
  let prisma: {
    merchant: {
      create: jest.Mock;
      findUnique: jest.Mock;
    };
    blockchainNetwork: {
      findFirst: jest.Mock;
    };
    merchantPayoutWallet: {
      upsert: jest.Mock;
    };
    networkToken: {
      findMany: jest.Mock;
    };
    merchantPayoutWalletToken: {
      upsert: jest.Mock;
    };
  };

  beforeEach(async () => {
    prisma = {
      merchant: {
        create: jest.fn(),
        findUnique: jest.fn(),
      },
      blockchainNetwork: {
        findFirst: jest.fn(),
      },
      merchantPayoutWallet: {
        upsert: jest.fn(),
      },
      networkToken: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      merchantPayoutWalletToken: {
        upsert: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MerchantService,
        {
          provide: PrismaService,
          useValue: prisma,
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MerchantService>(MerchantService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('preserves TRON payout wallet address casing on upsert', async () => {
    const tronAddress = 'TQ3J2n4C7x8A9bCdEfGhJkLmNoPqRsTuVw';
    const now = new Date();

    prisma.blockchainNetwork.findFirst.mockResolvedValue({
      id: 'network-tron',
      name: 'TRON Mainnet',
      chainId: BigInt('728126428'),
      code: 'TRON',
      symbol: 'TRX',
    });
    prisma.merchantPayoutWallet.upsert.mockResolvedValue({
      id: 'wallet-1',
      networkId: 'network-tron',
      address: tronAddress,
      label: 'Primary',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await service.upsertPayoutWallet('merchant-1', 'network-tron', {
      address: tronAddress,
      label: 'Primary',
    });

    expect(prisma.merchantPayoutWallet.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          address: tronAddress,
        }),
        create: expect.objectContaining({
          address: tronAddress,
        }),
      }),
    );
  });

  it('normalizes non-TRON payout wallet addresses to lowercase', async () => {
    const ethAddress = '0xAbCdEf0123456789abcdef0123456789ABCDef01';
    const now = new Date();

    prisma.blockchainNetwork.findFirst.mockResolvedValue({
      id: 'network-eth',
      name: 'Ethereum',
      chainId: BigInt(1),
      code: 'ETH',
      symbol: 'ETH',
    });
    prisma.merchantPayoutWallet.upsert.mockResolvedValue({
      id: 'wallet-2',
      networkId: 'network-eth',
      address: ethAddress.toLowerCase(),
      label: null,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await service.upsertPayoutWallet('merchant-1', 'network-eth', {
      address: ethAddress,
    });

    expect(prisma.merchantPayoutWallet.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          address: ethAddress.toLowerCase(),
        }),
        create: expect.objectContaining({
          address: ethAddress.toLowerCase(),
        }),
      }),
    );
  });
});
