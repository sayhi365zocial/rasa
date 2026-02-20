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
  await prisma.companyBankAccount.deleteMany()

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
    branches.map((branch: typeof branches[0], index: number) =>
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

  // Create Manager
  const manager = await prisma.user.create({
    data: {
      email: 'manager@mermed.com',
      username: 'manager',
      passwordHash: await bcrypt.hash('Manager@2026', 12),
      firstName: 'สมพร',
      lastName: 'จัดการ',
      phoneNumber: '081-222-2222',
      role: 'MANAGER',
      status: 'ACTIVE',
      branchId: null,
    },
  })

  console.log('✅ Created manager user')

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

  // Create Company Bank Accounts
  console.log('🏦 Creating company bank accounts...')
  const bankAccounts = await Promise.all([
    prisma.companyBankAccount.create({
      data: {
        bankName: 'ธนาคารกสิกรไทย',
        accountNumber: '123-4-56789-0',
        accountName: 'บริษัท เมอร์เมด คลินิก จำกัด',
        bankBranch: 'สาขาสยาม',
        isDefault: true,
        status: 'ACTIVE',
      },
    }),
    prisma.companyBankAccount.create({
      data: {
        bankName: 'ธนาคารไทยพาณิชย์',
        accountNumber: '886-224356-7',
        accountName: 'บริษัท เมอร์เมด คลินิก จำกัด',
        bankBranch: 'สาขาราชวงศ์ (ภูเก็ต)',
        isDefault: false,
        status: 'ACTIVE',
      },
    }),
    prisma.companyBankAccount.create({
      data: {
        bankName: 'ธนาคารกรุงเทพ',
        accountNumber: '987-6-54321-0',
        accountName: 'บริษัท เมอร์เมด คลินิก จำกัด',
        bankBranch: 'สาขาสีลม',
        isDefault: false,
        status: 'ACTIVE',
      },
    }),
  ])

  console.log(`✅ Created ${bankAccounts.length} company bank accounts`)

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

  // Create Sample Daily Closings
  console.log('📝 Creating sample daily closings...')

  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const twoDaysAgo = new Date(today)
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
  const threeDaysAgo = new Date(today)
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

  // SUBMITTED - รอรับเงิน (3 รายการ)
  const submittedClosings = await Promise.all([
    prisma.dailyClosing.create({
      data: {
        closingDate: yesterday,
        branchId: branches[0].id, // Rama9
        submittedBy: staffUsers[0].id,
        status: 'SUBMITTED',
        submittedAt: new Date(yesterday.getTime() + 18 * 60 * 60 * 1000), // 18:00

        // POS Data
        posTotalSales: 45000.00,
        posCash: 15000.00,
        posCredit: 20000.00,
        posTransfer: 10000.00,
        posExpenses: 2000.00,
        posBillCount: 45,
        posAvgPerBill: 1000.00,

        // Handwritten
        handwrittenCashCount: 14950.00,
        handwrittenExpenses: 2000.00,
        handwrittenNetCash: 12950.00,

        // EDC
        edcTotalAmount: 20000.00,

        // Validation
        hasDiscrepancy: true,
        discrepancyRemark: 'เงินสดขาด 50 บาท',
        posCreditVsEdcDiff: 0,
        posTotalVsHandwrittenDiff: -50.00,
      },
    }),
    prisma.dailyClosing.create({
      data: {
        closingDate: yesterday,
        branchId: branches[1].id, // Phuket
        submittedBy: staffUsers[1].id,
        status: 'SUBMITTED',
        submittedAt: new Date(yesterday.getTime() + 19 * 60 * 60 * 1000), // 19:00

        // POS Data
        posTotalSales: 38500.00,
        posCash: 12000.00,
        posCredit: 18500.00,
        posTransfer: 8000.00,
        posExpenses: 1500.00,
        posBillCount: 32,
        posAvgPerBill: 1203.13,

        // Handwritten
        handwrittenCashCount: 12000.00,
        handwrittenExpenses: 1500.00,
        handwrittenNetCash: 10500.00,

        // EDC
        edcTotalAmount: 18500.00,

        // Validation
        hasDiscrepancy: false,
        posCreditVsEdcDiff: 0,
        posTotalVsHandwrittenDiff: 0,
      },
    }),
    prisma.dailyClosing.create({
      data: {
        closingDate: today,
        branchId: branches[2].id, // Pattaya
        submittedBy: staffUsers[2].id,
        status: 'SUBMITTED',
        submittedAt: new Date(),

        // POS Data
        posTotalSales: 52000.00,
        posCash: 18000.00,
        posCredit: 25000.00,
        posTransfer: 9000.00,
        posExpenses: 2500.00,
        posBillCount: 51,
        posAvgPerBill: 1019.61,

        // Handwritten
        handwrittenCashCount: 18000.00,
        handwrittenExpenses: 2500.00,
        handwrittenNetCash: 15500.00,

        // EDC
        edcTotalAmount: 25000.00,

        // Validation
        hasDiscrepancy: false,
        posCreditVsEdcDiff: 0,
        posTotalVsHandwrittenDiff: 0,
      },
    }),
  ])

  console.log(`✅ Created ${submittedClosings.length} SUBMITTED closings`)

  // CASH_RECEIVED - รอนำฝาก (2 รายการ)
  const cashReceivedClosings = await Promise.all([
    prisma.dailyClosing.create({
      data: {
        closingDate: twoDaysAgo,
        branchId: branches[3].id, // Central
        submittedBy: staffUsers[3].id,
        status: 'CASH_RECEIVED',
        submittedAt: new Date(twoDaysAgo.getTime() + 18 * 60 * 60 * 1000),
        cashReceivedAt: new Date(twoDaysAgo.getTime() + 20 * 60 * 60 * 1000), // 20:00
        cashReceivedBy: auditor.id,

        // POS Data
        posTotalSales: 41000.00,
        posCash: 13500.00,
        posCredit: 19000.00,
        posTransfer: 8500.00,
        posExpenses: 1800.00,
        posBillCount: 40,
        posAvgPerBill: 1025.00,

        // Handwritten
        handwrittenCashCount: 13500.00,
        handwrittenExpenses: 1800.00,
        handwrittenNetCash: 11700.00,

        // EDC
        edcTotalAmount: 19000.00,

        // Validation
        hasDiscrepancy: false,
        posCreditVsEdcDiff: 0,
        posTotalVsHandwrittenDiff: 0,
      },
    }),
    prisma.dailyClosing.create({
      data: {
        closingDate: twoDaysAgo,
        branchId: branches[4].id, // Chiang Mai
        submittedBy: staffUsers[4].id,
        status: 'CASH_RECEIVED',
        submittedAt: new Date(twoDaysAgo.getTime() + 19 * 60 * 60 * 1000),
        cashReceivedAt: new Date(twoDaysAgo.getTime() + 21 * 60 * 60 * 1000), // 21:00
        cashReceivedBy: auditor.id,

        // POS Data
        posTotalSales: 36000.00,
        posCash: 11000.00,
        posCredit: 17000.00,
        posTransfer: 8000.00,
        posExpenses: 1600.00,
        posBillCount: 35,
        posAvgPerBill: 1028.57,

        // Handwritten
        handwrittenCashCount: 11000.00,
        handwrittenExpenses: 1600.00,
        handwrittenNetCash: 9400.00,

        // EDC
        edcTotalAmount: 17000.00,

        // Validation
        hasDiscrepancy: false,
        posCreditVsEdcDiff: 0,
        posTotalVsHandwrittenDiff: 0,
      },
    }),
  ])

  console.log(`✅ Created ${cashReceivedClosings.length} CASH_RECEIVED closings`)

  // DEPOSITED - นำฝากแล้ว (2 รายการ พร้อม Deposit records)
  const depositedClosing1 = await prisma.dailyClosing.create({
    data: {
      closingDate: threeDaysAgo,
      branchId: branches[0].id, // Rama9
      submittedBy: staffUsers[0].id,
      status: 'DEPOSITED',
      submittedAt: new Date(threeDaysAgo.getTime() + 18 * 60 * 60 * 1000),
      cashReceivedAt: new Date(threeDaysAgo.getTime() + 20 * 60 * 60 * 1000),
      cashReceivedBy: auditor.id,
      completedAt: new Date(threeDaysAgo.getTime() + 22 * 60 * 60 * 1000), // 22:00

      // POS Data
      posTotalSales: 48000.00,
      posCash: 16000.00,
      posCredit: 22000.00,
      posTransfer: 10000.00,
      posExpenses: 2200.00,
      posBillCount: 48,
      posAvgPerBill: 1000.00,

      // Handwritten
      handwrittenCashCount: 16000.00,
      handwrittenExpenses: 2200.00,
      handwrittenNetCash: 13800.00,

      // EDC
      edcTotalAmount: 22000.00,

      // Validation
      hasDiscrepancy: false,
      posCreditVsEdcDiff: 0,
      posTotalVsHandwrittenDiff: 0,
    },
  })

  await prisma.deposit.create({
    data: {
      dailyClosingId: depositedClosing1.id,
      depositSlipUrl: 'https://example.com/slip1.jpg',
      depositAmount: 13800.00,
      depositDate: threeDaysAgo,
      bankName: 'ธนาคารกสิกรไทย',
      accountNumber: '123-4-56789-0',
      amountMatched: true,
      depositedBy: auditor.id,
      depositedAt: new Date(threeDaysAgo.getTime() + 22 * 60 * 60 * 1000),
    },
  })

  const depositedClosing2 = await prisma.dailyClosing.create({
    data: {
      closingDate: threeDaysAgo,
      branchId: branches[1].id, // Phuket
      submittedBy: staffUsers[1].id,
      status: 'DEPOSITED',
      submittedAt: new Date(threeDaysAgo.getTime() + 19 * 60 * 60 * 1000),
      cashReceivedAt: new Date(threeDaysAgo.getTime() + 21 * 60 * 60 * 1000),
      cashReceivedBy: auditor.id,
      completedAt: new Date(threeDaysAgo.getTime() + 23 * 60 * 60 * 1000), // 23:00

      // POS Data
      posTotalSales: 39500.00,
      posCash: 12500.00,
      posCredit: 19000.00,
      posTransfer: 8000.00,
      posExpenses: 1700.00,
      posBillCount: 38,
      posAvgPerBill: 1039.47,

      // Handwritten
      handwrittenCashCount: 12500.00,
      handwrittenExpenses: 1700.00,
      handwrittenNetCash: 10800.00,

      // EDC
      edcTotalAmount: 19000.00,

      // Validation
      hasDiscrepancy: false,
      posCreditVsEdcDiff: 0,
      posTotalVsHandwrittenDiff: 0,
    },
  })

  await prisma.deposit.create({
    data: {
      dailyClosingId: depositedClosing2.id,
      depositSlipUrl: 'https://example.com/slip2.jpg',
      depositAmount: 10800.00,
      depositDate: threeDaysAgo,
      bankName: 'ธนาคารกรุงเทพ',
      accountNumber: '987-6-54321-0',
      amountMatched: true,
      depositedBy: auditor.id,
      depositedAt: new Date(threeDaysAgo.getTime() + 23 * 60 * 60 * 1000),
    },
  })

  console.log('✅ Created 2 DEPOSITED closings with deposits')

  // Create some audit logs
  console.log('📋 Creating audit logs...')
  await Promise.all([
    prisma.auditLog.create({
      data: {
        userId: auditor.id,
        action: 'STATUS_CHANGE',
        entityType: 'DailyClosing',
        entityId: depositedClosing1.id,
        fieldName: 'status',
        oldValue: 'SUBMITTED',
        newValue: 'CASH_RECEIVED',
        remark: 'รับเงินจากสาขา MerMed Rama9 จำนวน 13800 บาท',
      },
    }),
    prisma.auditLog.create({
      data: {
        userId: auditor.id,
        action: 'STATUS_CHANGE',
        entityType: 'DailyClosing',
        entityId: depositedClosing1.id,
        fieldName: 'status',
        oldValue: 'CASH_RECEIVED',
        newValue: 'DEPOSITED',
        remark: 'นำฝากเงินจากสาขา MerMed Rama9 จำนวน 13800 บาท เข้าบัญชี ธนาคารกสิกรไทย 123-4-56789-0',
      },
    }),
  ])

  console.log('✅ Created audit logs')

  // Summary
  console.log('\n📊 Seed Summary:')
  console.log('─────────────────────────────────────')
  console.log(`Branches: ${branches.length}`)
  console.log(`Users: ${staffUsers.length + 4} (${staffUsers.length} staff, 1 auditor, 1 manager, 1 owner, 1 admin)`)
  console.log(`Bank Accounts: ${bankAccounts.length}`)
  console.log(`Daily Closings:`)
  console.log(`  - SUBMITTED: ${submittedClosings.length}`)
  console.log(`  - CASH_RECEIVED: ${cashReceivedClosings.length}`)
  console.log(`  - DEPOSITED: 2`)
  console.log(`Deposits: 2`)
  console.log(`Audit Logs: 2`)
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
  console.log('Manager:')
  console.log('  Email: manager@mermed.com')
  console.log('  Password: Manager@2026')
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
