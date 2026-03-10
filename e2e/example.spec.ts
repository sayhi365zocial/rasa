import { test, expect } from '@playwright/test'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { ClosingPage } from './pages/ClosingPage'
import { TEST_ACCOUNTS } from './fixtures/test-accounts'
import { login, logout, isLoggedIn } from './helpers/auth'

/**
 * Example E2E Test Suite
 * Demonstrates how to use the Playwright testing infrastructure
 */

test.describe('Authentication Flow', () => {
  test('should login as staff user', async ({ page }) => {
    const loginPage = new LoginPage(page)
    const dashboardPage = new DashboardPage(page)

    // Navigate to login page
    await loginPage.goto()
    await loginPage.verifyPageLoaded()

    // Perform login
    await loginPage.loginWithRole(
      TEST_ACCOUNTS.staff.email,
      TEST_ACCOUNTS.staff.password,
      'STAFF'
    )

    // Verify redirect to staff dashboard
    await dashboardPage.verifyCurrentDashboard('STAFF')
    await expect(page).toHaveURL('/dashboard/staff')
  })

  test('should show error with invalid credentials', async ({ page }) => {
    const loginPage = new LoginPage(page)

    await loginPage.goto()
    await loginPage.submitLogin('invalid@email.com', 'wrongpassword')

    // Wait for error message
    await page.waitForTimeout(1000)

    // Verify error is shown
    const hasError = await loginPage.hasErrorMessage()
    expect(hasError).toBe(true)
  })

  test('should logout successfully', async ({ page }) => {
    const loginPage = new LoginPage(page)
    const dashboardPage = new DashboardPage(page)

    // Login first
    await loginPage.goto()
    await loginPage.login(TEST_ACCOUNTS.staff.email, TEST_ACCOUNTS.staff.password)

    // Verify logged in
    expect(await isLoggedIn(page)).toBe(true)

    // Logout
    await logout(page)

    // Verify redirected to login page
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Staff Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await login(page, TEST_ACCOUNTS.staff.email, TEST_ACCOUNTS.staff.password, 'STAFF')
  })

  test('should display staff dashboard', async ({ page }) => {
    const dashboardPage = new DashboardPage(page)

    await dashboardPage.gotoStaffDashboard()
    await dashboardPage.verifyPageLoaded()

    // Check if create new closing button exists
    const hasCreateButton = await dashboardPage.isCreateNewClosingVisible()
    expect(hasCreateButton).toBe(true)
  })

  test('should navigate to new closing page', async ({ page }) => {
    const dashboardPage = new DashboardPage(page)

    await dashboardPage.gotoStaffDashboard()
    await dashboardPage.clickCreateNewClosing()

    // Verify navigation to closing page
    await expect(page).toHaveURL(/\/closings\/new/)
  })
})

test.describe('Closing Creation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as staff
    await login(page, TEST_ACCOUNTS.staff.email, TEST_ACCOUNTS.staff.password, 'STAFF')
  })

  test('should display closing creation page', async ({ page }) => {
    const closingPage = new ClosingPage(page)

    await closingPage.goto()
    await closingPage.verifyPageLoaded()

    // Verify step 1 is active
    await closingPage.verifyStep(1)
  })

  test('should skip upload and fill manual data', async ({ page }) => {
    const closingPage = new ClosingPage(page)

    await closingPage.goto()

    // Set today's date
    const today = new Date().toISOString().split('T')[0]
    await closingPage.setClosingDate(today)

    // Skip upload
    await closingPage.skipUpload()

    // Verify moved to step 2
    await closingPage.verifyStep(2)

    // Fill closing data
    await closingPage.fillClosingData({
      totalSales: 50000,
      cash: 20000,
      credit: 15000,
      transfer: 10000,
      expenses: 5000,
    })

    // Verify calculations
    const netCash = await closingPage.getNetCashToDeposit()
    expect(netCash).toBe(15000) // 20000 - 5000

    const netBalance = await closingPage.getNetBalance()
    // 20000 + 15000 - (15000 * 0.03) + 10000 - 5000 = 39550
    expect(netBalance).toBeGreaterThan(39000)
  })

  test.skip('should create closing with full workflow', async ({ page }) => {
    // This test is skipped by default as it creates real data
    const closingPage = new ClosingPage(page)

    // Listen for dialog (success alert)
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('สำเร็จ')
      await dialog.accept()
    })

    await closingPage.createClosingWithManualEntry({
      closingDate: new Date().toISOString().split('T')[0],
      totalSales: 50000,
      cash: 20000,
      credit: 15000,
      transfer: 10000,
      expenses: 5000,
    })

    // Verify redirect back to dashboard
    await expect(page).toHaveURL(/\/dashboard\/staff/)
  })
})

test.describe('Multiple Role Access', () => {
  test('should login as different roles', async ({ page }) => {
    // Test staff access
    await login(page, TEST_ACCOUNTS.staff.email, TEST_ACCOUNTS.staff.password, 'STAFF')
    await expect(page).toHaveURL('/dashboard/staff')
    await logout(page)

    // Test manager access
    await login(page, TEST_ACCOUNTS.manager.email, TEST_ACCOUNTS.manager.password, 'MANAGER')
    await expect(page).toHaveURL('/dashboard/manager')
    await logout(page)

    // Test admin access
    await login(page, TEST_ACCOUNTS.admin.email, TEST_ACCOUNTS.admin.password, 'ADMIN')
    await expect(page).toHaveURL('/dashboard/admin')
  })
})
