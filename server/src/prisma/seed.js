import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with default users...');

  // Hash Admin Password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('Admin1234#', salt);

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@assetflow.com' },
  });

  if (!existingAdmin) {
    const admin = await prisma.user.create({
      data: {
        name: 'System Administrator',
        email: 'admin@assetflow.com',
        password: hashedPassword,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });
    console.log(`Created admin user: ${admin.email}`);
  } else {
    console.log('Admin user already exists. Skipping...');
  }

  // Create an example Employee user
  const employeePassword = await bcrypt.hash('Employee1234#', salt);
  const existingEmployee = await prisma.user.findUnique({
    where: { email: 'employee@assetflow.com' },
  });

  if (!existingEmployee) {
    const employee = await prisma.user.create({
      data: {
        name: 'John Doe',
        email: 'employee@assetflow.com',
        password: employeePassword,
        role: 'EMPLOYEE',
        status: 'ACTIVE',
      },
    });
    console.log(`Created employee user: ${employee.email}`);
  } else {
    console.log('Employee user already exists. Skipping...');
  }

  console.log('Database seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
