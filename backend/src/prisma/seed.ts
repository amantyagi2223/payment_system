// prisma/seed.ts

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { DEFAULT_NETWORKS } from '../blockchain/constants/network.constants';
import { generateWallet } from '../blockchain/wallet.util';
import { encryptPrivateKey } from '../orders/wallet-encryption.util';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Ensuring super admin account...');

  const superAdminEmail = (
    process.env.SUPER_ADMIN_EMAIL || 'superadmin@stealth.local'
  )
    .trim()
    .toLowerCase();
  const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || 'Admin12345';
  const superAdminPasswordHash = await bcrypt.hash(superAdminPassword, 10);

  await prisma.adminAccount.upsert({
    where: { email: superAdminEmail },
    update: {
      password: superAdminPasswordHash,
      isActive: true,
    },
    create: {
      email: superAdminEmail,
      password: superAdminPasswordHash,
      isActive: true,
    },
  });

  console.log(`✅ Super admin ready: ${superAdminEmail}`);
  console.log('🌱 Seeding blockchain networks...');

  const networks = await Promise.all(
    DEFAULT_NETWORKS.map((network) =>
      prisma.blockchainNetwork.upsert({
        where: { chainId: network.chainId },
        update: {
          name: network.name,
          code: network.code,
          rpcUrl: network.rpcUrl,
          symbol: network.symbol ?? null,
          isActive: true,
        },
        create: {
          name: network.name,
          code: network.code,
          chainId: network.chainId,
          rpcUrl: network.rpcUrl,
          symbol: network.symbol ?? null,
          isActive: true,
        },
      }),
    ),
  );

  console.log(`✅ ${DEFAULT_NETWORKS.length} networks upserted successfully`);
  console.log('🌱 Seeding network tokens...');

  for (const network of networks) {
    const normalizedCode = network.code?.trim().toUpperCase() || '';
    const nativeSymbol = (
      network.symbol || (normalizedCode.includes('TRON') ? 'TRX' : 'ETH')
    )
      .trim()
      .toUpperCase();
    const nativeDecimals = normalizedCode.includes('TRON') ? 6 : 18;

    await prisma.networkToken.upsert({
      where: {
        networkId_symbol: {
          networkId: network.id,
          symbol: nativeSymbol,
        },
      },
      update: {
        name: `${nativeSymbol} Native`,
        decimals: nativeDecimals,
        contractAddress: null,
        isNative: true,
        isActive: true,
      },
      create: {
        networkId: network.id,
        symbol: nativeSymbol,
        name: `${nativeSymbol} Native`,
        decimals: nativeDecimals,
        contractAddress: null,
        isNative: true,
        isActive: true,
      },
    });

  }

  console.log('✅ Network tokens seeded');
  console.log('🌱 Ensuring admin gas wallets...');

  for (const network of networks) {
    const existing = await prisma.adminGasWallet.findUnique({
      where: { networkId: network.id },
    });

    if (existing) {
      continue;
    }

    const wallet = generateWallet(network.code || 'ETH');
    const isTron = (network.code || '').toUpperCase().includes('TRON');
    const address = isTron ? wallet.address : wallet.address.toLowerCase();

    await prisma.adminGasWallet.create({
      data: {
        networkId: network.id,
        address,
        privateKey: encryptPrivateKey(wallet.privateKey),
        isActive: true,
      },
    });
  }

  console.log('✅ Admin gas wallets ensured for all configured networks');

  console.log('🌱 Ensuring merchant payout wallet token mappings...');
  const payoutWallets = await prisma.merchantPayoutWallet.findMany({
    where: { isActive: true },
    include: {
      network: {
        select: {
          id: true,
        },
      },
    },
  });

  for (const wallet of payoutWallets) {
    const tokens = await prisma.networkToken.findMany({
      where: {
        networkId: wallet.networkId,
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    for (const token of tokens) {
      await prisma.merchantPayoutWalletToken.upsert({
        where: {
          walletId_tokenId: {
            walletId: wallet.id,
            tokenId: token.id,
          },
        },
        update: {
          receiveAddress: wallet.address,
          isActive: true,
        },
        create: {
          walletId: wallet.id,
          tokenId: token.id,
          receiveAddress: wallet.address,
          isActive: true,
        },
      });
    }
  }
  console.log('✅ Merchant payout wallet token mappings ensured');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
