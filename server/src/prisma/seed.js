import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with Phase 1 & 2 default users and sample data...');

  const salt = await bcrypt.genSalt(10);
  const adminPassword = await bcrypt.hash('Admin1234#', salt);
  const employeePassword = await bcrypt.hash('Employee1234#', salt);

  // 1. Create Default Users (including requesting user)
  const usersToSeed = [
    {
      name: 'Aniket Yerawar',
      email: 'aniketyerawar0108@gmail.com',
      password: adminPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
    {
      name: 'System Administrator',
      email: 'admin@assetflow.com',
      password: adminPassword,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
    {
      name: 'John Doe',
      email: 'employee@assetflow.com',
      password: employeePassword,
      role: 'EMPLOYEE',
      status: 'ACTIVE',
    },
    {
      name: 'Asset Manager User',
      email: 'manager@assetflow.com',
      password: employeePassword,
      role: 'ASSET_MANAGER',
      status: 'ACTIVE',
    },
  ];

  const seededUsers = {};

  for (const u of usersToSeed) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        role: u.role,
        name: u.name,
        password: u.password,
        status: u.status,
      },
      create: u,
    });
    console.log(`Seeded user: ${user.email} as ${user.role}`);
    seededUsers[user.email] = user;
  }

  // 2. Create Sample Departments
  const departmentsToSeed = [
    {
      name: 'Information Technology',
      code: 'IT',
      description: 'IT and Systems Support',
      status: 'ACTIVE',
    },
    {
      name: 'Human Resources',
      code: 'HR',
      description: 'People Operations and Talent Acquisition',
      status: 'ACTIVE',
    },
    {
      name: 'Finance & Accounts',
      code: 'FIN',
      description: 'Corporate financial planning and accounting',
      status: 'ACTIVE',
    },
  ];

  const seededDepartments = {};

  for (const d of departmentsToSeed) {
    const dept = await prisma.department.upsert({
      where: { code: d.code },
      update: {
        name: d.name,
        description: d.description,
        status: d.status,
      },
      create: {
        ...d,
        createdById: seededUsers['admin@assetflow.com'].uuid,
      },
    });
    console.log(`Seeded department: ${dept.name} (${dept.code})`);
    seededDepartments[dept.code] = dept;
  }

  // Set IT Department Head as Asset Manager User for demo, and HR Department Head
  // Re-verify IT Department Head assignment
  await prisma.department.update({
    where: { id: seededDepartments['IT'].id },
    data: {
      headId: seededUsers['manager@assetflow.com'].uuid,
    },
  });
  
  // Promote the manager to DEPARTMENT_HEAD and assign to IT department
  await prisma.user.update({
    where: { id: seededUsers['manager@assetflow.com'].id },
    data: {
      role: 'DEPARTMENT_HEAD',
      departmentId: seededDepartments['IT'].id,
    },
  });

  // 3. Create Sample Categories
  const categoriesToSeed = [
    { name: 'Laptops & Workstations', description: 'Developer laptops, desktop towers', warrantyMonths: 36, depreciationYears: 3 },
    { name: 'Monitors & Displays', description: 'Office monitors and screens', warrantyMonths: 24, depreciationYears: 5 },
    { name: 'Office Chairs & Furniture', description: 'Ergonomic chairs and desks', warrantyMonths: 60, depreciationYears: 10 },
  ];

  for (const c of categoriesToSeed) {
    const cat = await prisma.category.upsert({
      where: { name: c.name },
      update: c,
      create: c,
    });
    console.log(`Seeded category: ${cat.name}`);
  }

  console.log('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
