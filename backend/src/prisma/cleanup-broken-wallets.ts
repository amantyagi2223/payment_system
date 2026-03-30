import { PrismaClient } from '@prisma/client';
import { decryptPrivateKey } from '../orders/wallet-encryption.util';

const prisma = new PrismaClient();

function canDecrypt(value: string | null | undefined): boolean {
  if (!value) return false;
  try {
    return Boolean(decryptPrivateKey(value));
  } catch {
    return false;
  }
}

async function main() {
  const apply = process.argv.includes('--apply');
  const deleteDetached = process.argv.includes('--delete-detached');
  console.log(
    `[wallet-cleanup] mode=${apply ? 'APPLY' : 'DRY_RUN'} deleteDetached=${deleteDetached}`,
  );

  const customerWallets = await prisma.customerWallet.findMany({
    where: {
      privateKey: {
        not: null,
      },
    },
    select: {
      id: true,
      address: true,
      customerId: true,
      networkId: true,
      privateKey: true,
      isUsed: true,
      _count: {
        select: {
          invoices: true,
        },
      },
    },
  });

  const brokenCustomerWallets = customerWallets.filter(
    (wallet) => !canDecrypt(wallet.privateKey),
  );

  let customerDeleted = 0;
  let customerDetached = 0;
  for (const wallet of brokenCustomerWallets) {
    if (wallet._count.invoices > 0) {
      console.log(
        `[wallet-cleanup] detach customer wallet ${wallet.id} (${wallet.address}) invoices=${wallet._count.invoices}`,
      );
      if (apply) {
        await prisma.customerWallet.update({
          where: { id: wallet.id },
          data: {
            customerId: null,
            isUsed: false,
          },
        });
      }
      customerDetached += 1;
    } else {
      const shouldDelete =
        deleteDetached || Boolean(wallet.customerId) || wallet.isUsed;
      if (shouldDelete) {
        console.log(
          `[wallet-cleanup] delete customer wallet ${wallet.id} (${wallet.address})`,
        );
        if (apply) {
          await prisma.customerWallet.delete({
            where: { id: wallet.id },
          });
        }
        customerDeleted += 1;
      } else {
        console.log(
          `[wallet-cleanup] keep detached wallet ${wallet.id} (${wallet.address}) (use --delete-detached to remove)`,
        );
      }
    }
  }

  const adminGasWallets = await prisma.adminGasWallet.findMany({
    select: {
      id: true,
      address: true,
      privateKey: true,
      networkId: true,
      isActive: true,
    },
  });
  const brokenGas = adminGasWallets.filter(
    (wallet) => !canDecrypt(wallet.privateKey),
  );
  for (const wallet of brokenGas) {
    console.log(
      `[wallet-cleanup] deactivate broken admin gas wallet ${wallet.id} (${wallet.address})`,
    );
    if (apply && wallet.isActive) {
      await prisma.adminGasWallet.update({
        where: { id: wallet.id },
        data: { isActive: false },
      });
    }
  }

  const adminFeeWallets = await prisma.adminFeeWallet.findMany({
    select: {
      id: true,
      address: true,
      privateKey: true,
      networkId: true,
      isActive: true,
    },
  });
  const brokenFee = adminFeeWallets.filter(
    (wallet) => !canDecrypt(wallet.privateKey),
  );
  for (const wallet of brokenFee) {
    console.log(
      `[wallet-cleanup] deactivate broken admin fee wallet ${wallet.id} (${wallet.address})`,
    );
    if (apply && wallet.isActive) {
      await prisma.adminFeeWallet.update({
        where: { id: wallet.id },
        data: { isActive: false },
      });
    }
  }

  console.log(
    `[wallet-cleanup] broken customer wallets=${brokenCustomerWallets.length} detached=${customerDetached} deleted=${customerDeleted}`,
  );
  console.log(
    `[wallet-cleanup] broken admin gas wallets=${brokenGas.length}, broken admin fee wallets=${brokenFee.length}`,
  );
}

main()
  .catch((error) => {
    console.error('[wallet-cleanup] failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
