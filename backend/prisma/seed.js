const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding test data...');

  // Test Customer
  const testEmail = 'test@example.com';
  const testPassword = await bcrypt.hash('password123', 10);

  await prisma.customer.upsert({
    where: { email: testEmail },
    update: {},
    create: {
      id: uuidv4(),
      name: 'Test User',
      email: testEmail,
      password: testPassword,
      isActive: true,
    },
  });

  // Test Customer Address (optional)
  await prisma.customerAddress.create({
      data: {
        id: uuidv4(),
        customerId: (await prisma.customer.findUnique({ where: { email: testEmail } })).id,
        name: 'Home',
        street1: '123 Test St',
        city: 'Test City',
        zipCode: '12345',
        country: 'US',
        isActive: true,
      },
    }).catch(() => console.log('Address exists'));

  console.log('✅ Test customer created: test@example.com / password123');
  console.log('Use Prisma Studio or login endpoint to get token');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
