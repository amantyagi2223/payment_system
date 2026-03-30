const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SUPER_ADMIN_EMAIL || 'superadmin@stealth.local';
  const password = process.env.SUPER_ADMIN_PASSWORD || 'Admin12345';
  const hash = await bcrypt.hash(password, 10);

  const admin = await prisma.adminAccount.upsert({
    where: { email: email.toLowerCase().trim() },
    update: { password: hash, isActive: true },
    create: {
      email: email.toLowerCase().trim(),
      password: hash,
      isActive: true,
    },
  });

  console.log(`✅ Admin created/updated: ${admin.email} (isActive: ${admin.isActive})`);
}

main()
  .catch(e => console.error('❌ Error:', e))
  .finally(async () => await prisma.$disconnect());
