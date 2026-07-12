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

  // Clear all department heads first to avoid unique constraint collisions during seed reruns
  await prisma.department.updateMany({
    data: { headId: null }
  });

  // Set IT Department Head as Asset Manager User for demo
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

  let chairCat;
  for (const c of categoriesToSeed) {
    const cat = await prisma.category.upsert({
      where: { name: c.name },
      update: c,
      create: c,
    });
    console.log(`Seeded category: ${cat.name}`);
    if (cat.name === 'Office Chairs & Furniture') {
      chairCat = cat;
    }
  }

  // 4. Create Sample Assets
  console.log('Seeding sample assets...');
  const laptopCat = await prisma.category.findFirst({ where: { name: 'Laptops & Workstations' } });
  const monitorCat = await prisma.category.findFirst({ where: { name: 'Monitors & Displays' } });

  const itDept = await prisma.department.findFirst({ where: { code: 'IT' } });
  const hrDept = await prisma.department.findFirst({ where: { code: 'HR' } });
  const adminUser = await prisma.user.findFirst({ where: { email: 'admin@assetflow.com' } });

  const assetsToSeed = [
    {
      assetTag: 'AF-0001',
      name: 'MacBook Pro 16" M3 Max',
      categoryId: laptopCat.id,
      departmentId: itDept.id,
      serialNumber: 'SN-MBP-M3-9992',
      qrCode: 'AF-QR-AF-0001-XYZ12',
      acquisitionDate: new Date('2026-01-10'),
      acquisitionCost: 3499.00,
      manufacturer: 'Apple Inc.',
      vendor: 'Apple Business Manager',
      condition: 'NEW',
      location: 'HQ - Floor 4',
      isBookable: false,
      warrantyExpiry: new Date('2029-01-10'),
      status: 'AVAILABLE',
      createdBy: adminUser.uuid,
    },
    {
      assetTag: 'AF-0002',
      name: 'Dell UltraSharp U2723QE',
      categoryId: monitorCat.id,
      departmentId: itDept.id,
      serialNumber: 'SN-DELL-U27-3829',
      qrCode: 'AF-QR-AF-0002-ABC45',
      acquisitionDate: new Date('2026-02-15'),
      acquisitionCost: 649.99,
      manufacturer: 'Dell Technologies',
      vendor: 'CDW Corporation',
      condition: 'GOOD',
      location: 'HQ - Floor 4',
      isBookable: true,
      warrantyExpiry: new Date('2028-02-15'),
      status: 'AVAILABLE',
      createdBy: adminUser.uuid,
    },
    {
      assetTag: 'AF-0003',
      name: 'Steelcase Gesture Ergonomic Chair',
      categoryId: chairCat.id,
      departmentId: hrDept.id,
      serialNumber: 'SN-STEEL-CHAIR-11',
      qrCode: 'AF-QR-AF-0003-DEF78',
      acquisitionDate: new Date('2026-03-01'),
      acquisitionCost: 1299.00,
      manufacturer: 'Steelcase',
      vendor: 'Steelcase Direct',
      condition: 'NEW',
      location: 'HQ - Floor 2',
      isBookable: false,
      warrantyExpiry: new Date('2036-03-01'),
      status: 'AVAILABLE',
      createdBy: adminUser.uuid,
    },
  ];

  for (const a of assetsToSeed) {
    const asset = await prisma.asset.upsert({
      where: { assetTag: a.assetTag },
      update: a,
      create: a,
    });
    console.log(`Seeded asset: ${asset.name} (${asset.assetTag})`);
  }

  // Advance Postgres sequence counter to 3 so next asset registered automatically gets AF-0004
  await prisma.$executeRawUnsafe("SELECT setval('asset_tag_seq', 3);");
  console.log('Postgres sequence asset_tag_seq set to 3');

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
