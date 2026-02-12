import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Clear existing data (optional - ระวังใน production!)
  console.log('🗑️  Clearing existing data...')
  await prisma.auditLog.deleteMany()
  await prisma.deposit.deleteMany()
  await prisma.dailyClosing.deleteMany()
  await prisma.user.deleteMany()
  await prisma.branch.deleteMany()
  await prisma.systemConfig.deleteMany()

  // Create Branches
  console.log('🏪 Creating branches...')
  const branches = await Promise.all([
    prisma.branch.create({
      data: {
        branchCode: 'BR001',
        branchName: 'MerMed Rama9',
        address: '123 ถ.พระราม 9 แขวงห้วยขวาง เขตห้วยขวาง กรุงเทพฯ 10310',
        phoneNumber: '02-123-4567',
        status: 'ACTIVE',
      },
    }),
    prisma.branch.create({
      data: {
        branchCode: 'BR002',
        branchName: 'MerMed Phuket',
        address: '456 ถ.ป่าตอง ต.ป่าตอง อ.กะทู้ จ.ภูเก็ต 83150',
        phoneNumber: '076-123-456',
        status: 'ACTIVE',
      },
    }),
    prisma.branch.create({
      data: {
        branchCode: 'BR003',
        branchName: 'MerMed Pattaya',
        address: '789 ถ.พัทยากลาง ต.หนองปรือ อ.บางละมุง จ.ชลบุรี 20150',
        phoneNumber: '038-123-456',
        status: 'ACTIVE',
      },
    }),
    prisma.branch.create({
      data: {
        branchCode: 'BR004',
        branchName: 'MerMed Central',
        address: '321 ถ.พระราม 1 แขวงปทุมวัน เขตปทุมวัน กรุงเทพฯ 10330',
        phoneNumber: '02-234-5678',
        status: 'ACTIVE',
      },
    }),
    prisma.branch.create({
      data: {
        branchCode: 'BR005',
        branchName: 'MerMed Chiang Mai',
        address: '888 ถ.นิมมานเหมินท์ ต.สุเทพ อ.เมือง จ.เชียงใหม่ 50200',
        phoneNumber: '053-123-456',
        status: 'ACTIVE',
      },
    }),
  ])

  console.log(`✅ Created ${branches.length} branches`)

  // Hash password for all users
  const password = await bcrypt.hash('Staff@2026', 12)

  // Create Users
  console.log('👥 Creating users...')

  // Store Staff for each branch
  const staffUsers = await Promise.all(
    branches.map((branch, index) =>
      prisma.user.create({
        data: {
          email: `staff.${branch.branchCode.toLowerCase()}@mermed.com`,
          username: `staff.${branch.branchCode.toLowerCase()}`,
          passwordHash: password,
          firstName: `สมชาย${index + 1}`,
          lastName: 'ใจดี',
          phoneNumber: `081-000-${String(index + 1).padStart(4, '0')}`,
          role: 'STORE_STAFF',
          status: 'ACTIVE',
          branchId: branch.id,
        },
      })
    )
  )

  console.log(`✅ Created ${staffUsers.length} store staff users`)

  // Create Auditor
  const auditor = await prisma.user.create({
    data: {
      email: 'auditor@mermed.com',
      username: 'auditor.main',
      passwordHash: await bcrypt.hash('Auditor@2026', 12),
      firstName: 'สมหญิง',
      lastName: 'ตรวจสอบ',
      phoneNumber: '081-111-1111',
      role: 'AUDITOR',
      status: 'ACTIVE',
      branchId: null,
    },
  })

  console.log('✅ Created auditor user')

  // Create Owner
  const owner = await prisma.user.create({
    data: {
      email: 'owner@mermed.com',
      username: 'owner',
      passwordHash: await bcrypt.hash('Owner@2026', 12),
      firstName: 'สมศักดิ์',
      lastName: 'เจ้าของ',
      phoneNumber: '081-999-9999',
      role: 'OWNER',
      status: 'ACTIVE',
      branchId: null,
    },
  })

  console.log('✅ Created owner user')

  // Create Admin
  const admin = await prisma.user.create({
    data: {
      email: 'admin@mermed.com',
      username: 'admin',
      passwordHash: await bcrypt.hash('Admin@2026', 12),
      firstName: 'ผู้ดูแล',
      lastName: 'ระบบ',
      phoneNumber: '081-888-8888',
      role: 'ADMIN',
      status: 'ACTIVE',
      branchId: null,
    },
  })

  console.log('✅ Created admin user')

  // Create System Config
  console.log('⚙️  Creating system config...')
  await prisma.systemConfig.createMany({
    data: [
      {
        key: 'DISCREPANCY_THRESHOLD_PERCENT',
        value: '1.0',
        description: 'Percentage threshold for discrepancy alerts',
        dataType: 'number',
      },
      {
        key: 'DISCREPANCY_THRESHOLD_AMOUNT',
        value: '50',
        description: 'Amount threshold for discrepancy alerts (THB)',
        dataType: 'number',
      },
      {
        key: 'DEPOSIT_VARIANCE_THRESHOLD',
        value: '10',
        description: 'Acceptable variance for deposit amount (THB)',
        dataType: 'number',
      },
    ],
  })

  console.log('✅ Created system config')

  // Summary
  console.log('\n📊 Seed Summary:')
  console.log('─────────────────────────────────────')
  console.log(`Branches: ${branches.length}`)
  console.log(`Users: ${staffUsers.length + 3} (${staffUsers.length} staff, 1 auditor, 1 owner, 1 admin)`)
  console.log('\n🔐 Login Credentials:')
  console.log('─────────────────────────────────────')
  console.log('Store Staff (Rama9):')
  console.log('  Email: staff.br001@mermed.com')
  console.log('  Password: Staff@2026')
  console.log('')
  console.log('Auditor:')
  console.log('  Email: auditor@mermed.com')
  console.log('  Password: Auditor@2026')
  console.log('')
  console.log('Owner:')
  console.log('  Email: owner@mermed.com')
  console.log('  Password: Owner@2026')
  console.log('')
  console.log('Admin:')
  console.log('  Email: admin@mermed.com')
  console.log('  Password: Admin@2026')
  console.log('─────────────────────────────────────')
  console.log('✅ Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
