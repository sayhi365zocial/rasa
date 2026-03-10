import { test, expect } from '@playwright/test'
import { LoginPage } from '../pages/LoginPage'
import { StaffDashboardPage } from '../pages/StaffDashboardPage'
import { login, logout } from '../helpers/auth'
import { testUsers } from '../fixtures/test-users'

/**
 * E2E Tests for Staff Role Workflow
 *
 * Tests all staff-specific functionality including:
 * - Login and dashboard access
 * - Creating daily closings
 * - Submitting closings for verification
 * - Viewing own closings
 * - Confirming bank deposits
 * - Branch access restrictions
 */

test.describe('Staff Workflow', () => {
  let loginPage: LoginPage
  let staffDashboard: StaffDashboardPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    staffDashboard = new StaffDashboardPage(page)
  })

  test('should login as staff and access staff dashboard', async ({ page }) => {
    const staff = testUsers.staff.rama9

    // Navigate to login page
    await loginPage.goto()

    // Login with staff credentials
    await login(page, staff.email, staff.password, 'STAFF')

    // Verify on staff dashboard
    await staffDashboard.verifyOnDashboard()

    // Take screenshot
    await page.screenshot({ path: 'test-results/staff-login-success.png' })
  })

  test('should create new daily closing', async ({ page }) => {
    const staff = testUsers.staff.rama9

    // Login
    await login(page, staff.email, staff.password, 'STAFF')
    await staffDashboard.goto()

    // Click create closing
    await staffDashboard.clickCreateClosing()

    // Fill in closing data
    await staffDashboard.createNewDailyClosing({
      posTotalSales: 50000,
      posCash: 15000,
      posCredit: 25000,
      posTransfer: 10000,
      posExpenses: 2000,
      handwrittenCashCount: 15000,
      handwrittenExpenses: 2000,
      edcTotalAmount: 25000,
    })

    // Save as draft (not submit yet)
    await page.click('button:has-text("Save Draft"), button:has-text("บันทึกแบบร่าง")')
    await page.waitForLoadState('networkidle')

    // Verify success message
    await expect(page.locator('text=/Saved successfully|บันทึกสำเร็จ/i')).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/staff-create-closing.png' })
  })

  test('should submit closing for verification', async ({ page }) => {
    const staff = testUsers.staff.rama9

    // Login
    await login(page, staff.email, staff.password, 'STAFF')
    await staffDashboard.goto()

    // Create and submit closing
    await staffDashboard.clickCreateClosing()
    await staffDashboard.createNewDailyClosing({
      posTotalSales: 45000,
      posCash: 14000,
      posCredit: 22000,
      posTransfer: 9000,
      posExpenses: 1800,
      handwrittenCashCount: 14000,
      handwrittenExpenses: 1800,
      edcTotalAmount: 22000,
    })

    // Submit for verification
    await staffDashboard.submitClosing()

    // Verify success message
    await expect(page.locator('text=/Submitted|ส่งตรวจสอบแล้ว/i')).toBeVisible()

    // Verify status changed to SUBMITTED
    await expect(page.locator('text=/SUBMITTED|รอตรวจสอบ/i')).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/staff-submit-closing.png' })
  })

  test('should view only own branch closings', async ({ page }) => {
    const staff = testUsers.staff.rama9

    // Login
    await login(page, staff.email, staff.password, 'STAFF')
    await staffDashboard.goto()

    // View own closings
    await staffDashboard.viewOwnClosings()

    // Verify can see own branch (BR001)
    await expect(page.locator('text=/BR001|Rama9/i')).toBeVisible()

    // Verify cannot see other branches
    await expect(page.locator('text=/BR002|Phuket/i')).not.toBeVisible()
    await expect(page.locator('text=/BR003|Pattaya/i')).not.toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/staff-view-own-closings.png' })
  })

  test('should confirm bank deposit after deposit is created', async ({ page }) => {
    const staff = testUsers.staff.rama9

    // Login
    await login(page, staff.email, staff.password, 'STAFF')
    await staffDashboard.goto()

    // Navigate to deposits page
    await page.click('a:has-text("Deposits"), a:has-text("การนำฝาก")')
    await page.waitForLoadState('networkidle')

    // Find a deposit that needs staff confirmation
    const confirmButton = page.locator('button:has-text("Confirm Deposit"), button:has-text("ยืนยันยอดฝาก")').first()

    if (await confirmButton.count() > 0) {
      await confirmButton.click()

      // Verify confirmation
      await expect(page.locator('text=/Confirmed|ยืนยันแล้ว/i')).toBeVisible()

      // Take screenshot
      await page.screenshot({ path: 'test-results/staff-confirm-deposit.png' })
    }
  })

  test('should NOT be able to access other branches', async ({ page }) => {
    const staff = testUsers.staff.rama9

    // Login
    await login(page, staff.email, staff.password, 'STAFF')
    await staffDashboard.goto()

    // Try to access another branch's data
    await staffDashboard.verifyCannotAccessOtherBranch()

    // Verify access denied or redirect
    const currentUrl = page.url()
    expect(currentUrl).not.toContain('branch=BR002')

    // Take screenshot
    await page.screenshot({ path: 'test-results/staff-access-denied-other-branch.png' })
  })

  test('should NOT be able to verify closings', async ({ page }) => {
    const staff = testUsers.staff.rama9

    // Login
    await login(page, staff.email, staff.password, 'STAFF')

    // Try to access checker dashboard
    await page.goto('/dashboard/checker')

    // Should be redirected or see error
    await expect(page).not.toHaveURL(/\/dashboard\/checker/)

    // Verify no access to verify functionality
    await expect(page.locator('button:has-text("Verify Closing")')).not.toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/staff-cannot-verify.png' })
  })

  test('should NOT be able to receive cash or create deposits', async ({ page }) => {
    const staff = testUsers.staff.rama9

    // Login
    await login(page, staff.email, staff.password, 'STAFF')

    // Try to access audit dashboard
    await page.goto('/dashboard/auditor')

    // Should not have access
    await expect(page).not.toHaveURL(/\/dashboard\/auditor/)

    // Verify no receive cash button
    await expect(page.locator('button:has-text("Receive Cash")')).not.toBeVisible()
    await expect(page.locator('button:has-text("Create Deposit")')).not.toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/staff-cannot-audit.png' })
  })

  test('should logout successfully', async ({ page }) => {
    const staff = testUsers.staff.rama9

    // Login
    await login(page, staff.email, staff.password, 'STAFF')
    await staffDashboard.goto()

    // Logout
    await logout(page)

    // Verify redirected to login page
    await expect(page).toHaveURL(/\/login/)

    // Verify cannot access dashboard without login
    await page.goto('/dashboard/staff')
    await expect(page).toHaveURL(/\/login/)

    // Take screenshot
    await page.screenshot({ path: 'test-results/staff-logout-success.png' })
  })

  test('should handle validation errors when creating closing', async ({ page }) => {
    const staff = testUsers.staff.rama9

    // Login
    await login(page, staff.email, staff.password, 'STAFF')
    await staffDashboard.goto()

    // Try to create closing with invalid data
    await staffDashboard.clickCreateClosing()

    // Submit without filling data
    await page.click('button[type="submit"]')

    // Verify validation errors
    await expect(page.locator('text=/Required|จำเป็น|กรุณากรอก/i')).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/staff-validation-errors.png' })
  })

  test('should show discrepancy warning when amounts do not match', async ({ page }) => {
    const staff = testUsers.staff.rama9

    // Login
    await login(page, staff.email, staff.password, 'STAFF')
    await staffDashboard.goto()

    // Create closing with mismatched amounts
    await staffDashboard.clickCreateClosing()
    await staffDashboard.createNewDailyClosing({
      posTotalSales: 50000,
      posCash: 15000,
      posCredit: 25000,
      posTransfer: 10000,
      posExpenses: 2000,
      handwrittenCashCount: 14500, // Mismatch: 500 baht short
      handwrittenExpenses: 2000,
      edcTotalAmount: 25000,
    })

    // Save draft
    await page.click('button:has-text("Save Draft")')
    await page.waitForLoadState('networkidle')

    // Verify discrepancy warning
    await expect(page.locator('text=/Discrepancy|ส่วนต่าง|ไม่ตรงกัน/i')).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/staff-discrepancy-warning.png' })
  })
})
