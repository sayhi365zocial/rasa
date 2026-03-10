import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Safety check: Only run in development/test environments
function checkEnvironment() {
  const env = process.env.NODE_ENV || 'development'
  const dbUrl = process.env.DATABASE_URL || ''

  // Don't allow running in production
  if (env === 'production' || dbUrl.includes('railway.app') || dbUrl.includes('prod')) {
    console.error('❌ ERROR: Cannot run test data setup in production environment!')
    console.error('   NODE_ENV:', env)
    console.error('   DATABASE_URL:', dbUrl.substring(0, 30) + '...')
    process.exit(1)
  }

  console.log('✅ Environment check passed:', env)
}

async function setupTestData() {
  console.log('🧪 Setting up E2E test data...\n')

  // Safety check
  checkEnvironment()

  try {
    // Get existing seed data
    const branches = await prisma.branch.findMany({ where: { status: 'ACTIVE' } })
    const users = await prisma.user.findMany()

    if (branches.length === 0) {
      console.error('❌ No branches found! Please run: npm run db:seed')
      process.exit(1)
    }

    console.log(`📊 Found ${branches.length} branches and ${users.length} users`)

    // Find key users
    const staffUser = users.find(u => u.role === 'STAFF' && u.branchId === branches[0].id)
    const auditorUser = users.find(u => u.role === 'AUDIT')
    const managerUser = users.find(u => u.role === 'MANAGER')
    const adminUser = users.find(u => u.role === 'ADMIN')

    if (!staffUser || !auditorUser || !managerUser) {
      console.error('❌ Required users not found! Please run: npm run db:seed')
      process.exit(1)
    }

    console.log('\n🧹 Cleaning existing E2E test data...')

    // Delete existing E2E test data (marked with E2E prefix)
    await prisma.deposit.deleteMany({
      where: {
        dailyClosing: {
          closingDate: {
            gte: new Date('2026-01-01'), // E2E test dates
          }
        }
      }
    })

    await prisma.dailyClosing.deleteMany({
      where: {
        closingDate: {
          gte: new Date('2026-01-01'), // E2E test dates
        }
      }
    })

    console.log('✅ Cleaned existing E2E test data\n')

    // Create test dates
    const today = new Date('2026-03-10')
    const yesterday = new Date('2026-03-09')
    const twoDaysAgo = new Date('2026-03-08')
    const threeDaysAgo = new Date('2026-03-07')

    console.log('📝 Creating test daily closings...')

    // 1. DRAFT closing (for staff to complete)
    const draftClosing = await prisma.dailyClosing.create({
      data: {
        closingDate: today,
        branchId: branches[0].id,
        submittedBy: staffUser.id,
        status: 'DRAFT',

        posTotalSales: 50000.00,
        posCash: 20000.00,
        posCredit: 25000.00,
        posTransfer: 5000.00,
        posExpenses: 2000.00,
        posBillCount: 50,
        posAvgPerBill: 1000.00,

        handwrittenCashCount: 20000.00,
        handwrittenExpenses: 2000.00,
        handwrittenNetCash: 18000.00,

        edcTotalAmount: 25000.00,

        hasDiscrepancy: false,
        posCreditVsEdcDiff: 0,
        posTotalVsHandwrittenDiff: 0,
      },
    })
    console.log(`  ✅ Created DRAFT closing (ID: ${draftClosing.id})`)

    // 2. SUBMITTED closing (waiting for audit to receive cash)
    const submittedClosing = await prisma.dailyClosing.create({
      data: {
        closingDate: yesterday,
        branchId: branches[0].id,
        submittedBy: staffUser.id,
        status: 'SUBMITTED',
        submittedAt: new Date(yesterday.getTime() + 18 * 60 * 60 * 1000),

        posTotalSales: 45000.00,
        posCash: 15000.00,
        posCredit: 20000.00,
        posTransfer: 10000.00,
        posExpenses: 2000.00,
        posBillCount: 45,
        posAvgPerBill: 1000.00,

        handwrittenCashCount: 15000.00,
        handwrittenExpenses: 2000.00,
        handwrittenNetCash: 13000.00,

        edcTotalAmount: 20000.00,

        hasDiscrepancy: false,
        posCreditVsEdcDiff: 0,
        posTotalVsHandwrittenDiff: 0,
      },
    })
    console.log(`  ✅ Created SUBMITTED closing (ID: ${submittedClosing.id})`)

    // 3. SUBMITTED closing with discrepancy
    const submittedDiscrepancyClosing = await prisma.dailyClosing.create({
      data: {
        closingDate: yesterday,
        branchId: branches[1].id,
        submittedBy: users.find(u => u.role === 'STAFF' && u.branchId === branches[1].id)?.id || staffUser.id,
        status: 'SUBMITTED',
        submittedAt: new Date(yesterday.getTime() + 19 * 60 * 60 * 1000),

        posTotalSales: 40000.00,
        posCash: 12000.00,
        posCredit: 18000.00,
        posTransfer: 10000.00,
        posExpenses: 1500.00,
        posBillCount: 40,
        posAvgPerBill: 1000.00,

        handwrittenCashCount: 11950.00, // 50 baht short
        handwrittenExpenses: 1500.00,
        handwrittenNetCash: 10450.00,

        edcTotalAmount: 18000.00,

        hasDiscrepancy: true,
        discrepancyRemark: 'เงินสดขาด 50 บาท - E2E Test Data',
        posCreditVsEdcDiff: 0,
        posTotalVsHandwrittenDiff: -50.00,
      },
    })
    console.log(`  ✅ Created SUBMITTED closing with discrepancy (ID: ${submittedDiscrepancyClosing.id})`)

    // 4. CASH_RECEIVED closing (ready for deposit)
    const cashReceivedClosing = await prisma.dailyClosing.create({
      data: {
        closingDate: twoDaysAgo,
        branchId: branches[0].id,
        submittedBy: staffUser.id,
        status: 'CASH_RECEIVED',
        submittedAt: new Date(twoDaysAgo.getTime() + 18 * 60 * 60 * 1000),
        cashReceivedAt: new Date(twoDaysAgo.getTime() + 20 * 60 * 60 * 1000),
        cashReceivedBy: auditorUser.id,

        posTotalSales: 48000.00,
        posCash: 16000.00,
        posCredit: 22000.00,
        posTransfer: 10000.00,
        posExpenses: 2200.00,
        posBillCount: 48,
        posAvgPerBill: 1000.00,

        handwrittenCashCount: 16000.00,
        handwrittenExpenses: 2200.00,
        handwrittenNetCash: 13800.00,

        edcTotalAmount: 22000.00,

        hasDiscrepancy: false,
        posCreditVsEdcDiff: 0,
        posTotalVsHandwrittenDiff: 0,
      },
    })
    console.log(`  ✅ Created CASH_RECEIVED closing (ID: ${cashReceivedClosing.id})`)

    // 5. DEPOSITED closing with deposit record
    const depositedClosing = await prisma.dailyClosing.create({
      data: {
        closingDate: threeDaysAgo,
        branchId: branches[0].id,
        submittedBy: staffUser.id,
        status: 'DEPOSITED',
        submittedAt: new Date(threeDaysAgo.getTime() + 18 * 60 * 60 * 1000),
        cashReceivedAt: new Date(threeDaysAgo.getTime() + 20 * 60 * 60 * 1000),
        cashReceivedBy: auditorUser.id,
        completedAt: new Date(threeDaysAgo.getTime() + 22 * 60 * 60 * 1000),

        posTotalSales: 42000.00,
        posCash: 14000.00,
        posCredit: 20000.00,
        posTransfer: 8000.00,
        posExpenses: 1800.00,
        posBillCount: 42,
        posAvgPerBill: 1000.00,

        handwrittenCashCount: 14000.00,
        handwrittenExpenses: 1800.00,
        handwrittenNetCash: 12200.00,

        edcTotalAmount: 20000.00,

        hasDiscrepancy: false,
        posCreditVsEdcDiff: 0,
        posTotalVsHandwrittenDiff: 0,
      },
    })
    console.log(`  ✅ Created DEPOSITED closing (ID: ${depositedClosing.id})`)

    // Create deposit record for DEPOSITED closing
    console.log('\n💰 Creating test deposits...')

    const bankAccounts = await prisma.companyBankAccount.findMany({ where: { status: 'ACTIVE' } })
    const defaultBank = bankAccounts.find(b => b.isDefault) || bankAccounts[0]

    const deposit = await prisma.deposit.create({
      data: {
        dailyClosingId: depositedClosing.id,
        depositSlipUrl: 'https://example.com/e2e-test-slip.jpg',
        depositAmount: 12200.00,
        depositDate: threeDaysAgo,
        bankName: defaultBank.bankName,
        accountNumber: defaultBank.accountNumber,
        amountMatched: true,
        depositedBy: auditorUser.id,
        depositedAt: new Date(threeDaysAgo.getTime() + 22 * 60 * 60 * 1000),
        approvalStatus: 'PENDING',
      },
    })
    console.log(`  ✅ Created deposit (ID: ${deposit.id})`)

    // Create manager branch access for E2E testing if needed
    console.log('\n🔑 Verifying manager branch access...')

    const existingAccess = await prisma.managerBranchAccess.findMany({
      where: { userId: managerUser.id }
    })

    if (existingAccess.length === 0) {
      await prisma.managerBranchAccess.createMany({
        data: branches.slice(0, 3).map(branch => ({
          userId: managerUser.id,
          branchId: branch.id,
          createdBy: adminUser?.id || managerUser.id,
        }))
      })
      console.log(`  ✅ Created manager branch access for ${branches.slice(0, 3).length} branches`)
    } else {
      console.log(`  ✅ Manager already has access to ${existingAccess.length} branches`)
    }

    // Create audit logs
    console.log('\n📋 Creating audit logs...')

    await prisma.auditLog.create({
      data: {
        userId: auditorUser.id,
        action: 'STATUS_CHANGE',
        entityType: 'DailyClosing',
        entityId: cashReceivedClosing.id,
        fieldName: 'status',
        oldValue: 'SUBMITTED',
        newValue: 'CASH_RECEIVED',
        remark: 'E2E Test: รับเงินจากสาขา',
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: auditorUser.id,
        action: 'STATUS_CHANGE',
        entityType: 'DailyClosing',
        entityId: depositedClosing.id,
        fieldName: 'status',
        oldValue: 'CASH_RECEIVED',
        newValue: 'DEPOSITED',
        remark: 'E2E Test: นำฝากเงินเข้าบัญชี',
      },
    })

    console.log('  ✅ Created audit logs')

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 E2E Test Data Summary')
    console.log('='.repeat(60))
    console.log('Daily Closings Created:')
    console.log(`  - DRAFT:         1 (ID: ${draftClosing.id.substring(0, 8)}...)`)
    console.log(`  - SUBMITTED:     2 (IDs: ${submittedClosing.id.substring(0, 8)}..., ${submittedDiscrepancyClosing.id.substring(0, 8)}...)`)
    console.log(`  - CASH_RECEIVED: 1 (ID: ${cashReceivedClosing.id.substring(0, 8)}...)`)
    console.log(`  - DEPOSITED:     1 (ID: ${depositedClosing.id.substring(0, 8)}...)`)
    console.log('')
    console.log('Deposits Created: 1')
    console.log('Audit Logs Created: 2')
    console.log('')
    console.log('Test Branches:')
    branches.slice(0, 3).forEach((branch, i) => {
      console.log(`  ${i + 1}. ${branch.branchName} (${branch.branchCode})`)
    })
    console.log('')
    console.log('Test Users Available:')
    console.log(`  - Staff:   ${staffUser.email}`)
    console.log(`  - Auditor: ${auditorUser.email}`)
    console.log(`  - Manager: ${managerUser.email}`)
    console.log('='.repeat(60))
    console.log('\n✅ E2E test data setup completed successfully!')
    console.log('   You can now run: npm run test:e2e')

  } catch (error) {
    console.error('\n❌ Error setting up test data:', error)
    throw error
  }
}

// Run the setup
setupTestData()
  .catch((error) => {
    console.error('Setup failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
