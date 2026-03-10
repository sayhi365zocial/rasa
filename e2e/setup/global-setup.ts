import { chromium, FullConfig } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Global Setup for Playwright E2E Tests
 * Runs once before all tests
 *
 * Responsibilities:
 * - Check if dev server is running
 * - Verify database connection
 * - Setup test environment
 * - Create necessary directories
 */
async function globalSetup(config: FullConfig) {
  console.log('\n🚀 Starting E2E Test Suite...\n')

  const baseURL = process.env.BASE_URL || config.projects?.[0]?.use?.baseURL || 'http://localhost:3000'
  const maxRetries = 30
  const retryDelay = 2000

  console.log('📋 Configuration:')
  console.log(`  - Base URL: ${baseURL}`)
  console.log(`  - Workers: ${config.workers}`)
  console.log(`  - CI Mode: ${process.env.CI ? 'Yes' : 'No'}`)

  // 1. Check if development server is running
  console.log('\n📡 Checking if development server is running...')
  let serverReady = false

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(baseURL)
      if (response.ok || response.status === 404 || response.status === 307) {
        serverReady = true
        console.log(`✅ Development server is ready at ${baseURL}`)
        break
      }
    } catch (error) {
      if (i === maxRetries - 1) {
        console.error(`❌ Development server is not responding at ${baseURL}`)
        console.error('   Please run: npm run dev')
        throw new Error('Development server is not running')
      }

      console.log(`   Waiting for server... (${i + 1}/${maxRetries})`)
      await new Promise((resolve) => setTimeout(resolve, retryDelay))
    }
  }

  if (!serverReady) {
    throw new Error('Failed to connect to development server')
  }

  // 2. Verify database connection by checking API health
  console.log('\n🗄️  Verifying database connection...')

  try {
    const healthCheckUrl = `${baseURL}/api/auth/login`
    const response = await fetch(healthCheckUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        identifier: 'health-check-user',
        password: 'will-fail-but-db-should-respond',
      }),
    })

    if (response.status === 401 || response.status === 400 || response.status === 404) {
      console.log('✅ Database connection verified')
    } else {
      console.warn('⚠️  Database connection check returned unexpected status:', response.status)
    }
  } catch (error) {
    console.error('❌ Database connection check failed')
    console.error('   Please ensure your database is running and properly configured')
    throw new Error('Database connection failed')
  }

  // 3. Check if test data exists
  console.log('\n👥 Checking test accounts...')

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    await page.goto(`${baseURL}/login`)
    await page.waitForLoadState('domcontentloaded')

    await page.fill('#identifier', 'staff.br001@mermed.com')
    await page.fill('#password', 'Staff@2026')
    await page.click('button[type="submit"]')

    await Promise.race([
      page.waitForURL('**/dashboard/**', { timeout: 5000 }),
      page.waitForSelector('.bg-red-50', { timeout: 5000 }),
    ])

    const currentUrl = page.url()

    if (currentUrl.includes('/dashboard')) {
      console.log('✅ Test accounts are available')
    } else {
      console.warn('⚠️  Test account login failed')
      console.warn('   Please run: npm run db:seed')
    }
  } catch (error) {
    console.warn('⚠️  Could not verify test accounts')
    console.warn('   Please ensure seed data is loaded: npm run db:seed')
  } finally {
    await browser.close()
  }

  // 4. Create necessary directories
  console.log('\n📁 Creating test directories...')

  try {
    const dirs = [
      path.resolve(process.cwd(), 'screenshots'),
      path.resolve(process.cwd(), '.auth'),
      path.resolve(process.cwd(), 'playwright-report'),
      path.resolve(process.cwd(), 'test-results'),
    ]

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
      }
    }

    console.log('✅ Test directories created')
  } catch (error) {
    console.error('❌ Failed to create directories:', error)
  }

  console.log('\n✅ Global setup completed successfully!\n')
}

export default globalSetup
