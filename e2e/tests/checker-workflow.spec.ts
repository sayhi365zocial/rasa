import { test, expect } from '@playwright/test'
import { LoginPage } from '../pages/LoginPage'
import { CheckerDashboardPage } from '../pages/CheckerDashboardPage'
import { login, logout } from '../helpers/auth'
import { testUsers } from '../fixtures/test-users'

/**
 * E2E Tests for Checker Role Workflow
 *
 * Tests all checker-specific functionality including:
 * - Login and dashboard access
 * - Viewing submitted closings
 * - Verifying closings (not own submissions)
 * - Preventing self-verification
 * - Access restrictions
 */

test.describe('Checker Workflow', () => {
  let loginPage: LoginPage
  let checkerDashboard: CheckerDashboardPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    checkerDashboard = new CheckerDashboardPage(page)
  })

  test('should login as checker and access dashboard', async ({ page }) => {
    const checker = testUsers.checker

    // Navigate to login page
    await loginPage.goto()

    // Login with checker credentials
    await login(page, checker.email, checker.password, 'CHECKER')

    // Verify on checker dashboard (might redirect to staff dashboard with checker permissions)
    const url = page.url()
    expect(url).toMatch(/\/dashboard\/(staff|checker)/)

    // Take screenshot
    await page.screenshot({ path: 'test-results/checker-login-success.png' })
  })

  test('should view submitted closings', async ({ page }) => {
    const checker = testUsers.checker

    // Login
    await login(page, checker.email, checker.password)
    await page.waitForLoadState('networkidle')

    // Navigate to submitted closings
    await page.click('a:has-text("Submitted"), a:has-text("รอตรวจสอบ")')
    await page.waitForLoadState('networkidle')

    // Verify submitted closings are visible
    await expect(page.locator('text=/SUBMITTED|รอตรวจสอบ/i')).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/checker-view-submitted.png' })
  })

  test('should verify closing submitted by staff (not checker)', async ({ page }) => {
    const checker = testUsers.checker

    // Login
    await login(page, checker.email, checker.password)
    await page.waitForLoadState('networkidle')

    // Navigate to submitted closings
    await page.click('a:has-text("Submitted"), a:has-text("รอตรวจสอบ")')
    await page.waitForLoadState('networkidle')

    // Find a closing submitted by staff (not by checker)
    const verifyButton = page.locator('button:has-text("Verify"), button:has-text("ตรวจสอบ")').first()

    if (await verifyButton.count() > 0) {
      // Get the closing ID before clicking
      const closingRow = verifyButton.locator('..')
      const submittedBy = await closingRow.locator('[data-submitted-by]').getAttribute('data-submitted-by')

      // Verify it's not submitted by checker
      expect(submittedBy).not.toBe(checker.email)

      // Click verify
      await verifyButton.click()
      await page.waitForLoadState('networkidle')

      // Confirm verification
      const confirmButton = page.locator('button:has-text("Confirm Verification"), button:has-text("ยืนยันการตรวจสอบ")')
      if (await confirmButton.count() > 0) {
        await confirmButton.click()
        await page.waitForLoadState('networkidle')
      }

      // Verify success message
      await expect(page.locator('text=/Verified|ตรวจสอบแล้ว/i')).toBeVisible()

      // Take screenshot
      await page.screenshot({ path: 'test-results/checker-verify-success.png' })
    }
  })

  test('should NOT be able to verify own submission', async ({ page }) => {
    const checker = testUsers.checker

    // Login
    await login(page, checker.email, checker.password)
    await page.waitForLoadState('networkidle')

    // First, create a closing as checker (since checker can also submit)
    await page.click('a:has-text("Create Closing"), button:has-text("สร้างรายการ")')
    await page.waitForLoadState('networkidle')

    // Fill and submit closing
    await page.fill('input[name="posTotalSales"]', '40000')
    await page.fill('input[name="posCash"]', '12000')
    await page.fill('input[name="posCredit"]', '20000')
    await page.fill('input[name="posTransfer"]', '8000')
    await page.fill('input[name="posExpenses"]', '1500')
    await page.fill('input[name="handwrittenCashCount"]', '12000')
    await page.fill('input[name="handwrittenExpenses"]', '1500')
    await page.fill('input[name="edcTotalAmount"]', '20000')

    await page.click('button:has-text("Submit"), button:has-text("ส่งตรวจสอบ")')
    await page.waitForLoadState('networkidle')

    // Try to verify own submission
    await page.click('a:has-text("Submitted"), a:has-text("รอตรวจสอบ")')
    await page.waitForLoadState('networkidle')

    // Try to click verify on own submission
    const ownClosing = page.locator('tr:has-text("checker")').first()
    if (await ownClosing.count() > 0) {
      const verifyButton = ownClosing.locator('button:has-text("Verify")')

      if (await verifyButton.count() > 0) {
        await verifyButton.click()

        // Should see error message
        await expect(
          page.locator('text=/Cannot verify own submission|ไม่สามารถตรวจสอบรายการของตนเอง/i')
        ).toBeVisible()

        // Take screenshot
        await page.screenshot({ path: 'test-results/checker-cannot-verify-own.png' })
      } else {
        // Verify button should not be visible for own submissions
        await expect(verifyButton).not.toBeVisible()
      }
    }
  })

  test('should NOT be able to access admin features', async ({ page }) => {
    const checker = testUsers.checker

    // Login
    await login(page, checker.email, checker.password)

    // Try to access admin user management
    await page.goto('/dashboard/admin/users')

    // Should be redirected or blocked
    await expect(page).not.toHaveURL(/\/dashboard\/admin/)

    // Try to access admin branches
    await page.goto('/dashboard/admin/branches')
    await expect(page).not.toHaveURL(/\/dashboard\/admin/)

    // Take screenshot
    await page.screenshot({ path: 'test-results/checker-no-admin-access.png' })
  })

  test('should NOT be able to access owner features', async ({ page }) => {
    const checker = testUsers.checker

    // Login
    await login(page, checker.email, checker.password)

    // Try to access owner dashboard
    await page.goto('/dashboard/owner')
    await expect(page).not.toHaveURL(/\/dashboard\/owner/)

    // Try to access reports
    await page.goto('/dashboard/owner/reports')
    await expect(page).not.toHaveURL(/\/dashboard\/owner/)

    // Take screenshot
    await page.screenshot({ path: 'test-results/checker-no-owner-access.png' })
  })

  test('should NOT be able to approve deposits', async ({ page }) => {
    const checker = testUsers.checker

    // Login
    await login(page, checker.email, checker.password)

    // Navigate to deposits page
    await page.goto('/dashboard/auditor/deposits')

    // Should not have approve button
    await expect(page.locator('button:has-text("Approve Deposit")')).not.toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/checker-cannot-approve-deposits.png' })
  })

  test('should be able to submit closings as checker', async ({ page }) => {
    const checker = testUsers.checker

    // Login
    await login(page, checker.email, checker.password)
    await page.waitForLoadState('networkidle')

    // Create new closing
    await page.click('a:has-text("Create Closing"), button:has-text("สร้างรายการ")')
    await page.waitForLoadState('networkidle')

    // Fill closing data
    await page.fill('input[name="posTotalSales"]', '35000')
    await page.fill('input[name="posCash"]', '10000')
    await page.fill('input[name="posCredit"]', '18000')
    await page.fill('input[name="posTransfer"]', '7000')
    await page.fill('input[name="posExpenses"]', '1200')
    await page.fill('input[name="handwrittenCashCount"]', '10000')
    await page.fill('input[name="handwrittenExpenses"]', '1200')
    await page.fill('input[name="edcTotalAmount"]', '18000')

    // Submit
    await page.click('button:has-text("Submit"), button:has-text("ส่งตรวจสอบ")')
    await page.waitForLoadState('networkidle')

    // Verify success
    await expect(page.locator('text=/Submitted|ส่งแล้ว/i')).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/checker-submit-closing.png' })
  })

  test('should only see own branch closings', async ({ page }) => {
    const checker = testUsers.checker

    // Login
    await login(page, checker.email, checker.password)
    await page.waitForLoadState('networkidle')

    // View closings
    await page.click('a:has-text("Closings"), a:has-text("รายการปิดวัน")')
    await page.waitForLoadState('networkidle')

    // Should see BR001 (Rama9) only
    await expect(page.locator('text=/BR001|Rama9/i')).toBeVisible()

    // Should not see other branches
    await expect(page.locator('text=/BR002|Phuket/i')).not.toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/checker-own-branch-only.png' })
  })

  test('should logout successfully', async ({ page }) => {
    const checker = testUsers.checker

    // Login
    await login(page, checker.email, checker.password)
    await page.waitForLoadState('networkidle')

    // Logout
    await logout(page)

    // Verify on login page
    await expect(page).toHaveURL(/\/login/)

    // Take screenshot
    await page.screenshot({ path: 'test-results/checker-logout-success.png' })
  })
})
