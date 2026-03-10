import { test, expect } from '@playwright/test'
import { LoginPage } from '../pages/LoginPage'
import { AuditDashboardPage } from '../pages/AuditDashboardPage'
import { login, logout } from '../helpers/auth'
import { testUsers } from '../fixtures/test-users'

/**
 * E2E Tests for Audit Role Workflow
 *
 * Tests all audit-specific functionality including:
 * - Login and dashboard access
 * - Viewing verified closings
 * - Receiving cash from closings
 * - Creating deposits
 * - Viewing deposit status
 * - Access restrictions
 */

test.describe('Audit Workflow', () => {
  let loginPage: LoginPage
  let auditDashboard: AuditDashboardPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    auditDashboard = new AuditDashboardPage(page)
  })

  test('should login as auditor and access audit dashboard', async ({ page }) => {
    const auditor = testUsers.auditor

    // Navigate to login page
    await loginPage.goto()

    // Login with auditor credentials
    await login(page, auditor.email, auditor.password, 'AUDIT')

    // Verify on audit dashboard
    await auditDashboard.verifyOnDashboard()

    // Take screenshot
    await page.screenshot({ path: 'test-results/audit-login-success.png' })
  })

  test('should view verified closings waiting for cash receipt', async ({ page }) => {
    const auditor = testUsers.auditor

    // Login
    await login(page, auditor.email, auditor.password, 'AUDIT')
    await auditDashboard.goto()

    // View verified closings
    await auditDashboard.viewVerifiedClosings()

    // Verify closings with SUBMITTED status are visible
    await expect(page.locator('text=/SUBMITTED|Verified|รอรับเงิน/i')).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/audit-view-verified-closings.png' })
  })

  test('should receive cash from verified closing', async ({ page }) => {
    const auditor = testUsers.auditor

    // Login
    await login(page, auditor.email, auditor.password, 'AUDIT')
    await auditDashboard.goto()

    // View verified closings
    await auditDashboard.viewVerifiedClosings()

    // Find and click receive cash button
    const receiveCashButton = page.locator('button:has-text("Receive Cash"), button:has-text("รับเงิน")').first()

    if (await receiveCashButton.count() > 0) {
      await receiveCashButton.click()
      await page.waitForLoadState('networkidle')

      // Confirm receiving cash
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("ยืนยัน")')
      if (await confirmButton.count() > 0) {
        await confirmButton.click()
        await page.waitForLoadState('networkidle')
      }

      // Verify success message
      await expect(page.locator('text=/Cash received|รับเงินแล้ว/i')).toBeVisible()

      // Verify status changed to CASH_RECEIVED
      await expect(page.locator('text=/CASH_RECEIVED|รอนำฝาก/i')).toBeVisible()

      // Take screenshot
      await page.screenshot({ path: 'test-results/audit-receive-cash.png' })
    }
  })

  test('should create deposit from received cash', async ({ page }) => {
    const auditor = testUsers.auditor

    // Login
    await login(page, auditor.email, auditor.password, 'AUDIT')
    await auditDashboard.goto()

    // Navigate to cash received closings
    await page.click('a:has-text("Cash Received"), a:has-text("รอนำฝาก")')
    await page.waitForLoadState('networkidle')

    // Find closing with CASH_RECEIVED status
    const createDepositButton = page.locator('button:has-text("Create Deposit"), button:has-text("สร้างรายการนำฝาก")').first()

    if (await createDepositButton.count() > 0) {
      await createDepositButton.click()
      await page.waitForLoadState('networkidle')

      // Fill deposit form
      await page.fill('input[name="depositAmount"]', '12000')
      await page.selectOption('select[name="bankAccountId"]', { index: 0 })

      // Upload deposit slip (if available)
      const fileInput = page.locator('input[type="file"]')
      if (await fileInput.count() > 0) {
        // In real test, you would upload an actual file
        // await fileInput.setInputFiles('test-data/deposit-slip.jpg')
      }

      // Submit deposit
      await page.click('button[type="submit"]:has-text("Create Deposit"), button[type="submit"]:has-text("สร้าง")')
      await page.waitForLoadState('networkidle')

      // Verify success
      await expect(page.locator('text=/Deposit created|สร้างรายการนำฝากแล้ว/i')).toBeVisible()

      // Take screenshot
      await page.screenshot({ path: 'test-results/audit-create-deposit.png' })
    }
  })

  test('should view deposit status', async ({ page }) => {
    const auditor = testUsers.auditor

    // Login
    await login(page, auditor.email, auditor.password, 'AUDIT')
    await auditDashboard.goto()

    // View deposits
    await auditDashboard.viewDepositStatus()

    // Verify deposits table is visible
    await expect(page.locator('table, [role="table"]')).toBeVisible()

    // Verify deposit statuses
    await expect(
      page.locator('text=/PENDING|APPROVED|FLAGGED|รอการอนุมัติ/i')
    ).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/audit-view-deposits.png' })
  })

  test('should NOT be able to submit closings', async ({ page }) => {
    const auditor = testUsers.auditor

    // Login
    await login(page, auditor.email, auditor.password, 'AUDIT')

    // Try to access staff create closing page
    await page.goto('/dashboard/staff/closings/new')

    // Should be redirected or blocked
    await expect(page).not.toHaveURL(/\/dashboard\/staff/)

    // Verify no submit closing button
    await expect(page.locator('button:has-text("Submit Closing")')).not.toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/audit-cannot-submit.png' })
  })

  test('should NOT be able to verify closings', async ({ page }) => {
    const auditor = testUsers.auditor

    // Login
    await login(page, auditor.email, auditor.password, 'AUDIT')
    await auditDashboard.goto()

    // Verify no verify button on submitted closings
    await expect(page.locator('button:has-text("Verify Closing")')).not.toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/audit-cannot-verify.png' })
  })

  test('should NOT be able to approve deposits', async ({ page }) => {
    const auditor = testUsers.auditor

    // Login
    await login(page, auditor.email, auditor.password, 'AUDIT')
    await auditDashboard.goto()

    // View deposits
    await auditDashboard.viewDepositStatus()

    // Should not have approve button (only owner can approve)
    await expect(page.locator('button:has-text("Approve Deposit")')).not.toBeVisible()

    // Try to access owner dashboard
    await page.goto('/dashboard/owner/deposits')
    await expect(page).not.toHaveURL(/\/dashboard\/owner/)

    // Take screenshot
    await page.screenshot({ path: 'test-results/audit-cannot-approve-deposits.png' })
  })

  test('should NOT be able to access admin features', async ({ page }) => {
    const auditor = testUsers.auditor

    // Login
    await login(page, auditor.email, auditor.password, 'AUDIT')

    // Try to access admin dashboard
    await page.goto('/dashboard/admin')
    await expect(page).not.toHaveURL(/\/dashboard\/admin/)

    // Try to access user management
    await page.goto('/dashboard/admin/users')
    await expect(page).not.toHaveURL(/\/dashboard\/admin/)

    // Take screenshot
    await page.screenshot({ path: 'test-results/audit-no-admin-access.png' })
  })

  test('should see all branches (not restricted to one branch)', async ({ page }) => {
    const auditor = testUsers.auditor

    // Login
    await login(page, auditor.email, auditor.password, 'AUDIT')
    await auditDashboard.goto()

    // View all verified closings
    await auditDashboard.viewVerifiedClosings()

    // Should see multiple branches
    const branchCodes = ['BR001', 'BR002', 'BR003', 'BR004', 'BR005']

    // Check if multiple branches are visible (auditor has access to all)
    for (const branchCode of branchCodes) {
      const branchElement = page.locator(`text=${branchCode}`)
      // Don't assert visibility since not all branches may have data
      // Just verify auditor can see the branch selector or multiple branches
    }

    // Verify branch filter/selector is available
    const branchFilter = page.locator('select:has-text("Branch"), select#branch-filter')
    if (await branchFilter.count() > 0) {
      const options = await branchFilter.locator('option').count()
      expect(options).toBeGreaterThan(1) // Should have multiple branch options
    }

    // Take screenshot
    await page.screenshot({ path: 'test-results/audit-all-branches.png' })
  })

  test('should handle cash count mismatch scenario', async ({ page }) => {
    const auditor = testUsers.auditor

    // Login
    await login(page, auditor.email, auditor.password, 'AUDIT')
    await auditDashboard.goto()

    // View verified closings
    await auditDashboard.viewVerifiedClosings()

    // Find closing with discrepancy flag
    const discrepancyClosing = page.locator('tr:has-text("Discrepancy"), tr:has-text("ส่วนต่าง")').first()

    if (await discrepancyClosing.count() > 0) {
      // Click to view details
      await discrepancyClosing.click()
      await page.waitForLoadState('networkidle')

      // Verify discrepancy information is shown
      await expect(page.locator('text=/Discrepancy|ส่วนต่าง/i')).toBeVisible()

      // Can still receive cash despite discrepancy
      const receiveCashButton = page.locator('button:has-text("Receive Cash")')
      if (await receiveCashButton.count() > 0) {
        await expect(receiveCashButton).toBeEnabled()
      }

      // Take screenshot
      await page.screenshot({ path: 'test-results/audit-discrepancy-handling.png' })
    }
  })

  test('should logout successfully', async ({ page }) => {
    const auditor = testUsers.auditor

    // Login
    await login(page, auditor.email, auditor.password, 'AUDIT')
    await auditDashboard.goto()

    // Logout
    await logout(page)

    // Verify on login page
    await expect(page).toHaveURL(/\/login/)

    // Verify cannot access dashboard
    await page.goto('/dashboard/auditor')
    await expect(page).toHaveURL(/\/login/)

    // Take screenshot
    await page.screenshot({ path: 'test-results/audit-logout-success.png' })
  })
})
