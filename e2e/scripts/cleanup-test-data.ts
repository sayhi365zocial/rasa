import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Safety check: Only run in development/test environments
function checkEnvironment() {
  const env = process.env.NODE_ENV || 'development'
  const dbUrl = process.env.DATABASE_URL || ''

  // Don't allow running in production
  if (env === 'production' || dbUrl.includes('railway.app') || dbUrl.includes('prod')) {
    console.error('❌ ERROR: Cannot run cleanup in production environment!')
    console.error('   NODE_ENV:', env)
    console.error('   DATABASE_URL:', dbUrl.substring(0, 30) + '...')
    process.exit(1)
  }

  console.log('✅ Environment check passed:', env)
}

async function cleanupTestData() {
  console.log('🧹 Cleaning up E2E test data...\n')

  // Safety check
  checkEnvironment()

  try {
    // Count existing E2E test data
    console.log('📊 Counting E2E test data...')

    const testClosingsCount = await prisma.dailyClosing.count({
      where: {
        closingDate: {
          gte: new Date('2026-01-01'), // E2E test dates
        }
      }
    })

    const testDepositsCount = await prisma.deposit.count({
      where: {
        dailyClosing: {
          closingDate: {
            gte: new Date('2026-01-01'),
          }
        }
      }
    })

    const testAuditLogsCount = await prisma.auditLog.count({
      where: {
        remark: {
          contains: 'E2E Test'
        }
      }
    })

    console.log(`  - Daily Closings: ${testClosingsCount}`)
    console.log(`  - Deposits: ${testDepositsCount}`)
    console.log(`  - Audit Logs: ${testAuditLogsCount}`)

    if (testClosingsCount === 0 && testDepositsCount === 0 && testAuditLogsCount === 0) {
      console.log('\n✅ No E2E test data found. Database is already clean.')
      return
    }

    console.log('\n🗑️  Deleting E2E test data...')

    // Delete in correct order (due to foreign key constraints)

    // 1. Delete deposits first
    const deletedDeposits = await prisma.deposit.deleteMany({
      where: {
        dailyClosing: {
          closingDate: {
            gte: new Date('2026-01-01'),
          }
        }
      }
    })
    console.log(`  ✅ Deleted ${deletedDeposits.count} deposits`)

    // 2. Delete daily closings
    const deletedClosings = await prisma.dailyClosing.deleteMany({
      where: {
        closingDate: {
          gte: new Date('2026-01-01'),
        }
      }
    })
    console.log(`  ✅ Deleted ${deletedClosings.count} daily closings`)

    // 3. Delete E2E audit logs
    const deletedAuditLogs = await prisma.auditLog.deleteMany({
      where: {
        remark: {
          contains: 'E2E Test'
        }
      }
    })
    console.log(`  ✅ Deleted ${deletedAuditLogs.count} audit logs`)

    // Verify cleanup
    console.log('\n✓ Verifying cleanup...')

    const remainingClosings = await prisma.dailyClosing.count({
      where: {
        closingDate: {
          gte: new Date('2026-01-01'),
        }
      }
    })

    const remainingDeposits = await prisma.deposit.count({
      where: {
        dailyClosing: {
          closingDate: {
            gte: new Date('2026-01-01'),
          }
        }
      }
    })

    if (remainingClosings === 0 && remainingDeposits === 0) {
      console.log('  ✅ Cleanup verified - all E2E test data removed')
    } else {
      console.warn(`  ⚠️  Warning: ${remainingClosings} closings and ${remainingDeposits} deposits still remain`)
    }

    // Summary
    console.log('\n' + '='.repeat(60))
    console.log('📊 Cleanup Summary')
    console.log('='.repeat(60))
    console.log(`Deleted Items:`)
    console.log(`  - Daily Closings: ${deletedClosings.count}`)
    console.log(`  - Deposits:       ${deletedDeposits.count}`)
    console.log(`  - Audit Logs:     ${deletedAuditLogs.count}`)
    console.log('='.repeat(60))
    console.log('\n✅ E2E test data cleanup completed successfully!')
    console.log('   Database restored to clean state.')
    console.log('   Run "npm run test:e2e:setup" to recreate test data.')

  } catch (error) {
    console.error('\n❌ Error cleaning up test data:', error)
    throw error
  }
}

// Run the cleanup
cleanupTestData()
  .catch((error) => {
    console.error('Cleanup failed:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
