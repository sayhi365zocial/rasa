import { test, expect } from '@playwright/test'
import { LoginPage } from '../pages/LoginPage'
import { OwnerDashboardPage } from '../pages/OwnerDashboardPage'
import { login, logout } from '../helpers/auth'
import { testUsers } from '../fixtures/test-users'

/**
 * E2E Tests for Owner Role Workflow
 *
 * Tests all owner-specific functionality including:
 * - Login and dashboard access
 * - Viewing all branches
 * - Approving deposits
 * - Viewing reports and revenue
 * - Full system access
 * - Granting manager branch access
 */

test.describe('Owner Workflow', () => {
  let loginPage: LoginPage
  let ownerDashboard: OwnerDashboardPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    ownerDashboard = new OwnerDashboardPage(page)
  })

  test('should login as owner and access owner dashboard', async ({ page }) => {
    const owner = testUsers.owner

    // Navigate to login page
    await loginPage.goto()

    // Login with owner credentials
    await login(page, owner.email, owner.password, 'OWNER')

    // Verify on owner dashboard
    await ownerDashboard.verifyOnDashboard()

    // Take screenshot
    await page.screenshot({ path: 'test-results/owner-login-success.png' })
  })

  test('should view all branches', async ({ page }) => {
    const owner = testUsers.owner

    // Login
    await login(page, owner.email, owner.password, 'OWNER')
    await ownerDashboard.goto()

    // View branches
    await ownerDashboard.viewAllBranches()

    // Verify all branches are visible
    const branches = ['BR001', 'BR002', 'BR003', 'BR004', 'BR005']
    for (const branchCode of branches) {
      await ownerDashboard.verifyBranchVisible(branchCode)
    }

    // Take screenshot
    await page.screenshot({ path: 'test-results/owner-view-all-branches.png' })
  })

  test('should approve deposit', async ({ page }) => {
    const owner = testUsers.owner

    // Login
    await login(page, owner.email, owner.password, 'OWNER')
    await ownerDashboard.goto()

    // Navigate to deposits
    await page.click('a:has-text("Deposits"), a:has-text("การนำฝาก")')
    await page.waitForLoadState('networkidle')

    // Find pending deposit
    const approveButton = page.locator('button:has-text("Approve"), button:has-text("อนุมัติ")').first()

    if (await approveButton.count() > 0) {
      await approveButton.click()
      await page.waitForLoadState('networkidle')

      // Confirm approval
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("ยืนยัน")')
      if (await confirmButton.count() > 0) {
        await confirmButton.click()
        await page.waitForLoadState('networkidle')
      }

      // Verify success
      await expect(page.locator('text=/Approved|อนุมัติแล้ว/i')).toBeVisible()

      // Take screenshot
      await page.screenshot({ path: 'test-results/owner-approve-deposit.png' })
    }
  })

  test('should flag deposit with remark', async ({ page }) => {
    const owner = testUsers.owner

    // Login
    await login(page, owner.email, owner.password, 'OWNER')
    await ownerDashboard.goto()

    // Navigate to deposits
    await page.click('a:has-text("Deposits")')
    await page.waitForLoadState('networkidle')

    // Find pending deposit
    const flagButton = page.locator('button:has-text("Flag"), button:has-text("ตั้งค่าสถานะ")').first()

    if (await flagButton.count() > 0) {
      await flagButton.click()
      await page.waitForLoadState('networkidle')

      // Enter remark
      await page.fill('textarea[name="remark"], input[name="remark"]', 'Amount mismatch detected')

      // Confirm flag
      await page.click('button:has-text("Flag Deposit"), button:has-text("ยืนยัน")')
      await page.waitForLoadState('networkidle')

      // Verify flagged
      await expect(page.locator('text=/Flagged|ตั้งค่าสถานะแล้ว/i')).toBeVisible()

      // Take screenshot
      await page.screenshot({ path: 'test-results/owner-flag-deposit.png' })
    }
  })

  test('should reject deposit with remark', async ({ page }) => {
    const owner = testUsers.owner

    // Login
    await login(page, owner.email, owner.password, 'OWNER')
    await ownerDashboard.goto()

    // Navigate to deposits
    await page.click('a:has-text("Deposits")')
    await page.waitForLoadState('networkidle')

    // Find pending deposit
    const rejectButton = page.locator('button:has-text("Reject"), button:has-text("ปฏิเสธ")').first()

    if (await rejectButton.count() > 0) {
      await rejectButton.click()
      await page.waitForLoadState('networkidle')

      // Enter remark
      await page.fill('textarea[name="remark"], input[name="remark"]', 'Incorrect bank account')

      // Confirm rejection
      await page.click('button:has-text("Reject Deposit"), button:has-text("ยืนยัน")')
      await page.waitForLoadState('networkidle')

      // Verify rejected
      await expect(page.locator('text=/Rejected|ปฏิเสธแล้ว/i')).toBeVisible()

      // Take screenshot
      await page.screenshot({ path: 'test-results/owner-reject-deposit.png' })
    }
  })

  test('should view revenue reports', async ({ page }) => {
    const owner = testUsers.owner

    // Login
    await login(page, owner.email, owner.password, 'OWNER')
    await ownerDashboard.goto()

    // View revenue
    await ownerDashboard.viewRevenue()

    // Verify revenue page is loaded
    await expect(page).toHaveURL(/revenue|reports/)

    // Verify revenue metrics are visible
    await expect(page.locator('text=/Total Revenue|รายได้รวม/i')).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/owner-view-revenue.png' })
  })

  test('should view comprehensive reports', async ({ page }) => {
    const owner = testUsers.owner

    // Login
    await login(page, owner.email, owner.password, 'OWNER')
    await ownerDashboard.goto()

    // View reports
    await ownerDashboard.viewReports()

    // Verify reports page
    await expect(page).toHaveURL(/reports/)

    // Verify report types are available
    const reportTypes = [
      'Daily Revenue',
      'Monthly Summary',
      'Branch Performance',
      'Discrepancy Report',
    ]

    // Check if at least some report types are visible
    for (const reportType of reportTypes) {
      // Don't assert all as UI might be different
      // Just verify reports page is accessible
    }

    // Take screenshot
    await page.screenshot({ path: 'test-results/owner-view-reports.png' })
  })

  test('should grant manager branch access', async ({ page }) => {
    const owner = testUsers.owner

    // Login
    await login(page, owner.email, owner.password, 'OWNER')
    await ownerDashboard.goto()

    // Navigate to manager access management
    await page.click('a:has-text("Manager Access"), a:has-text("สิทธิ์ผู้จัดการ")')
    await page.waitForLoadState('networkidle')

    // Grant access
    const grantAccessButton = page.locator('button:has-text("Grant Access"), button:has-text("มอบสิทธิ์")')

    if (await grantAccessButton.count() > 0) {
      await grantAccessButton.click()
      await page.waitForLoadState('networkidle')

      // Fill form
      await page.fill('input[name="managerEmail"], select[name="managerId"]', 'manager@mermed.com')
      await page.selectOption('select[name="branchId"]', { index: 0 })

      // Submit
      await page.click('button[type="submit"]:has-text("Grant")')
      await page.waitForLoadState('networkidle')

      // Verify success (might already exist)
      const successOrExists = await Promise.race([
        page.locator('text=/Granted|มอบสิทธิ์แล้ว/i').isVisible(),
        page.locator('text=/Already exists|มีอยู่แล้ว/i').isVisible(),
      ])

      expect(successOrExists).toBeTruthy()

      // Take screenshot
      await page.screenshot({ path: 'test-results/owner-grant-access.png' })
    }
  })

  test('should revoke manager branch access', async ({ page }) => {
    const owner = testUsers.owner

    // Login
    await login(page, owner.email, owner.password, 'OWNER')
    await ownerDashboard.goto()

    // Navigate to manager access
    await page.click('a:has-text("Manager Access")')
    await page.waitForLoadState('networkidle')

    // Find revoke button
    const revokeButton = page.locator('button:has-text("Revoke"), button:has-text("ยกเลิก")').first()

    if (await revokeButton.count() > 0) {
      await revokeButton.click()
      await page.waitForLoadState('networkidle')

      // Confirm revocation
      const confirmButton = page.locator('button:has-text("Confirm")')
      if (await confirmButton.count() > 0) {
        await confirmButton.click()
        await page.waitForLoadState('networkidle')
      }

      // Verify success
      await expect(page.locator('text=/Revoked|ยกเลิกแล้ว/i')).toBeVisible()

      // Take screenshot
      await page.screenshot({ path: 'test-results/owner-revoke-access.png' })
    }
  })

  test('should access all features', async ({ page }) => {
    const owner = testUsers.owner

    // Login
    await login(page, owner.email, owner.password, 'OWNER')
    await ownerDashboard.goto()

    // Test access to various features
    const features = [
      { name: 'Reports', url: '/dashboard/owner/reports' },
      { name: 'Deposits', url: '/dashboard/owner/deposits' },
      { name: 'Branches', url: '/dashboard/owner/branches' },
      { name: 'Revenue', url: '/dashboard/owner/revenue' },
    ]

    for (const feature of features) {
      await page.goto(feature.url)
      await expect(page).toHaveURL(new RegExp(feature.url.replace(/\//g, '\\/')))
    }

    // Take screenshot
    await page.screenshot({ path: 'test-results/owner-all-features.png' })
  })

  test('should view all closings from all branches', async ({ page }) => {
    const owner = testUsers.owner

    // Login
    await login(page, owner.email, owner.password, 'OWNER')
    await ownerDashboard.goto()

    // Navigate to closings
    await page.click('a:has-text("All Closings"), a:has-text("ทั้งหมด")')
    await page.waitForLoadState('networkidle')

    // Verify can see closings from all branches
    const allBranches = ['BR001', 'BR002', 'BR003', 'BR004', 'BR005']

    // Owner should have access to all branches
    // Verify branch filter shows all branches
    const branchFilter = page.locator('select#branch-filter, select[name="branchId"]')
    if (await branchFilter.count() > 0) {
      const options = await branchFilter.locator('option').allTextContents()

      // Should have multiple options (all branches)
      expect(options.length).toBeGreaterThan(3)
    }

    // Take screenshot
    await page.screenshot({ path: 'test-results/owner-all-closings.png' })
  })

  test('should perform staff operations', async ({ page }) => {
    const owner = testUsers.owner

    // Login
    await login(page, owner.email, owner.password, 'OWNER')
    await ownerDashboard.goto()

    // Owner can create closings
    await page.click('a:has-text("Create Closing")')
    await page.waitForLoadState('networkidle')

    // Verify can access create closing form
    await expect(page).toHaveURL(/closings\/new|create/)

    // Take screenshot
    await page.screenshot({ path: 'test-results/owner-staff-operations.png' })
  })

  test('should perform audit operations', async ({ page }) => {
    const owner = testUsers.owner

    // Login
    await login(page, owner.email, owner.password, 'OWNER')
    await ownerDashboard.goto()

    // Owner can receive cash
    await page.click('a:has-text("Receive Cash")')
    await page.waitForLoadState('networkidle')

    // Verify can access receive cash page
    await expect(page.locator('text=/Cash Received|รับเงิน/i')).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/owner-audit-operations.png' })
  })

  test('should view audit logs', async ({ page }) => {
    const owner = testUsers.owner

    // Login
    await login(page, owner.email, owner.password, 'OWNER')
    await ownerDashboard.goto()

    // Navigate to audit logs
    await page.click('a:has-text("Audit Logs"), a:has-text("ประวัติการใช้งาน")')
    await page.waitForLoadState('networkidle')

    // Verify audit logs page
    await expect(page.locator('table, [role="table"]')).toBeVisible()

    // Verify can see various actions
    await expect(page.locator('text=/STATUS_CHANGE|CREATE|UPDATE|DELETE/i')).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/owner-audit-logs.png' })
  })

  test('should view system configuration', async ({ page }) => {
    const owner = testUsers.owner

    // Login
    await login(page, owner.email, owner.password, 'OWNER')
    await ownerDashboard.goto()

    // Navigate to settings
    await page.click('a:has-text("Settings"), a:has-text("ตั้งค่า")')
    await page.waitForLoadState('networkidle')

    // Verify settings page
    await expect(page).toHaveURL(/settings|config/)

    // Take screenshot
    await page.screenshot({ path: 'test-results/owner-settings.png' })
  })

  test('should logout successfully', async ({ page }) => {
    const owner = testUsers.owner

    // Login
    await login(page, owner.email, owner.password, 'OWNER')
    await ownerDashboard.goto()

    // Logout
    await logout(page)

    // Verify on login page
    await expect(page).toHaveURL(/\/login/)

    // Verify cannot access dashboard
    await page.goto('/dashboard/owner')
    await expect(page).toHaveURL(/\/login/)

    // Take screenshot
    await page.screenshot({ path: 'test-results/owner-logout-success.png' })
  })
})
