import { test, expect } from '@playwright/test'
import { LoginPage } from '../pages/LoginPage'
import { AdminDashboardPage } from '../pages/AdminDashboardPage'
import { login, logout } from '../helpers/auth'
import { testUsers } from '../fixtures/test-users'

/**
 * E2E Tests for Admin Role Workflow
 *
 * Tests all admin-specific functionality including:
 * - Login and dashboard access
 * - Managing users (create, edit, delete)
 * - Managing branches
 * - Managing bank accounts
 * - Access restrictions (no operational access)
 */

test.describe('Admin Workflow', () => {
  let loginPage: LoginPage
  let adminDashboard: AdminDashboardPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    adminDashboard = new AdminDashboardPage(page)
  })

  test('should login as admin and access admin dashboard', async ({ page }) => {
    const admin = testUsers.admin

    // Navigate to login page
    await loginPage.goto()

    // Login with admin credentials
    await login(page, admin.email, admin.password, 'ADMIN')

    // Verify on admin dashboard
    await adminDashboard.verifyOnDashboard()

    // Take screenshot
    await page.screenshot({ path: 'test-results/admin-login-success.png' })
  })

  test('should view user management page', async ({ page }) => {
    const admin = testUsers.admin

    // Login
    await login(page, admin.email, admin.password, 'ADMIN')
    await adminDashboard.goto()

    // Manage users
    await adminDashboard.manageUsers()

    // Verify user list is visible
    await expect(page.locator('table, [role="table"]')).toBeVisible()

    // Verify user columns
    await expect(page.locator('th:has-text("Email"), th:has-text("อีเมล")')).toBeVisible()
    await expect(page.locator('th:has-text("Role"), th:has-text("บทบาท")')).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/admin-view-users.png' })
  })

  test('should create new user', async ({ page }) => {
    const admin = testUsers.admin

    // Login
    await login(page, admin.email, admin.password, 'ADMIN')
    await adminDashboard.goto()

    // Navigate to users
    await adminDashboard.manageUsers()

    // Click create user
    await page.click('button:has-text("Create User"), button:has-text("สร้างผู้ใช้")')
    await page.waitForLoadState('networkidle')

    // Fill user form
    const timestamp = Date.now()
    await page.fill('input[name="email"]', `testuser${timestamp}@mermed.com`)
    await page.fill('input[name="username"]', `testuser${timestamp}`)
    await page.fill('input[name="firstName"]', 'Test')
    await page.fill('input[name="lastName"]', 'User')
    await page.fill('input[name="password"]', 'TestPass@123')
    await page.selectOption('select[name="role"]', 'STAFF')

    // Select branch (for staff)
    const branchSelector = page.locator('select[name="branchId"]')
    if (await branchSelector.count() > 0) {
      await branchSelector.selectOption({ index: 0 })
    }

    // Submit
    await page.click('button[type="submit"]:has-text("Create")')
    await page.waitForLoadState('networkidle')

    // Verify success
    await expect(page.locator('text=/Created|สร้างแล้ว|success/i')).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/admin-create-user.png' })
  })

  test('should edit existing user', async ({ page }) => {
    const admin = testUsers.admin

    // Login
    await login(page, admin.email, admin.password, 'ADMIN')
    await adminDashboard.goto()

    // Navigate to users
    await adminDashboard.manageUsers()

    // Find and click edit on a user
    const editButton = page.locator('button:has-text("Edit"), button[aria-label="Edit"]').first()

    if (await editButton.count() > 0) {
      await editButton.click()
      await page.waitForLoadState('networkidle')

      // Update user info
      await page.fill('input[name="firstName"]', 'Updated Name')

      // Save changes
      await page.click('button[type="submit"]:has-text("Save"), button[type="submit"]:has-text("บันทึก")')
      await page.waitForLoadState('networkidle')

      // Verify success
      await expect(page.locator('text=/Updated|แก้ไขแล้ว|success/i')).toBeVisible()

      // Take screenshot
      await page.screenshot({ path: 'test-results/admin-edit-user.png' })
    }
  })

  test('should delete user', async ({ page }) => {
    const admin = testUsers.admin

    // Login
    await login(page, admin.email, admin.password, 'ADMIN')
    await adminDashboard.goto()

    // Navigate to users
    await adminDashboard.manageUsers()

    // Find delete button for a test user
    const deleteButton = page.locator('button:has-text("Delete"), button[aria-label="Delete"]').first()

    if (await deleteButton.count() > 0) {
      // Get user email before deleting
      const userRow = deleteButton.locator('..')
      const userEmail = await userRow.locator('td:first-child').textContent()

      await deleteButton.click()
      await page.waitForLoadState('networkidle')

      // Confirm deletion
      const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("ยืนยัน")')
      if (await confirmButton.count() > 0) {
        await confirmButton.click()
        await page.waitForLoadState('networkidle')
      }

      // Verify success
      await expect(page.locator('text=/Deleted|ลบแล้ว|removed/i')).toBeVisible()

      // Take screenshot
      await page.screenshot({ path: 'test-results/admin-delete-user.png' })
    }
  })

  test('should manage branches', async ({ page }) => {
    const admin = testUsers.admin

    // Login
    await login(page, admin.email, admin.password, 'ADMIN')
    await adminDashboard.goto()

    // Navigate to branches
    await adminDashboard.manageBranches()

    // Verify branches list
    await expect(page.locator('table, [role="table"]')).toBeVisible()

    // Verify all branches are shown
    const branches = ['BR001', 'BR002', 'BR003', 'BR004', 'BR005']
    for (const branchCode of branches) {
      await expect(page.locator(`text=${branchCode}`)).toBeVisible()
    }

    // Take screenshot
    await page.screenshot({ path: 'test-results/admin-manage-branches.png' })
  })

  test('should create new branch', async ({ page }) => {
    const admin = testUsers.admin

    // Login
    await login(page, admin.email, admin.password, 'ADMIN')
    await adminDashboard.goto()

    // Navigate to branches
    await adminDashboard.manageBranches()

    // Click create branch
    await page.click('button:has-text("Create Branch"), button:has-text("สร้างสาขา")')
    await page.waitForLoadState('networkidle')

    // Fill branch form
    const timestamp = Date.now()
    await page.fill('input[name="branchCode"]', `BR${timestamp.toString().slice(-3)}`)
    await page.fill('input[name="branchName"]', `Test Branch ${timestamp}`)
    await page.fill('input[name="address"]', '123 Test Street, Test City')
    await page.fill('input[name="phoneNumber"]', '02-111-2222')

    // Submit
    await page.click('button[type="submit"]:has-text("Create")')
    await page.waitForLoadState('networkidle')

    // Verify success
    await expect(page.locator('text=/Created|สร้างแล้ว|success/i')).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/admin-create-branch.png' })
  })

  test('should edit branch', async ({ page }) => {
    const admin = testUsers.admin

    // Login
    await login(page, admin.email, admin.password, 'ADMIN')
    await adminDashboard.goto()

    // Navigate to branches
    await adminDashboard.manageBranches()

    // Find and click edit
    const editButton = page.locator('button:has-text("Edit")').first()

    if (await editButton.count() > 0) {
      await editButton.click()
      await page.waitForLoadState('networkidle')

      // Update branch info
      await page.fill('input[name="phoneNumber"]', '02-999-8888')

      // Save
      await page.click('button[type="submit"]:has-text("Save")')
      await page.waitForLoadState('networkidle')

      // Verify success
      await expect(page.locator('text=/Updated|แก้ไขแล้ว/i')).toBeVisible()

      // Take screenshot
      await page.screenshot({ path: 'test-results/admin-edit-branch.png' })
    }
  })

  test('should manage bank accounts', async ({ page }) => {
    const admin = testUsers.admin

    // Login
    await login(page, admin.email, admin.password, 'ADMIN')
    await adminDashboard.goto()

    // Navigate to bank accounts
    await adminDashboard.manageBankAccounts()

    // Verify bank accounts list
    await expect(page.locator('table, [role="table"]')).toBeVisible()

    // Verify bank account columns
    await expect(page.locator('th:has-text("Bank Name"), th:has-text("ธนาคาร")')).toBeVisible()
    await expect(page.locator('th:has-text("Account Number"), th:has-text("เลขที่บัญชี")')).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/admin-manage-bank-accounts.png' })
  })

  test('should create bank account', async ({ page }) => {
    const admin = testUsers.admin

    // Login
    await login(page, admin.email, admin.password, 'ADMIN')
    await adminDashboard.goto()

    // Navigate to bank accounts
    await adminDashboard.manageBankAccounts()

    // Click create
    await page.click('button:has-text("Create Bank Account"), button:has-text("สร้างบัญชี")')
    await page.waitForLoadState('networkidle')

    // Fill form
    const timestamp = Date.now()
    await page.fill('input[name="bankName"]', 'ธนาคารทดสอบ')
    await page.fill('input[name="accountNumber"]', `999-9-${timestamp.toString().slice(-5)}-0`)
    await page.fill('input[name="accountName"]', 'บริษัท เมอร์เมด คลินิก จำกัด')
    await page.fill('input[name="bankBranch"]', 'สาขาทดสอบ')

    // Submit
    await page.click('button[type="submit"]:has-text("Create")')
    await page.waitForLoadState('networkidle')

    // Verify success
    await expect(page.locator('text=/Created|สร้างแล้ว/i')).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/admin-create-bank-account.png' })
  })

  test('should NOT be able to access operational features', async ({ page }) => {
    const admin = testUsers.admin

    // Login
    await login(page, admin.email, admin.password, 'ADMIN')

    // Try to access staff dashboard
    await page.goto('/dashboard/staff')
    await expect(page).not.toHaveURL(/\/dashboard\/staff/)

    // Try to access audit dashboard
    await page.goto('/dashboard/auditor')
    await expect(page).not.toHaveURL(/\/dashboard\/auditor/)

    // Verify no access to closings
    await page.goto('/dashboard/staff/closings/new')
    await expect(page).not.toHaveURL(/\/closings/)

    // Take screenshot
    await page.screenshot({ path: 'test-results/admin-no-operational-access.png' })
  })

  test('should NOT be able to submit closings', async ({ page }) => {
    const admin = testUsers.admin

    // Login
    await login(page, admin.email, admin.password, 'ADMIN')
    await adminDashboard.goto()

    // Verify no create closing button
    await expect(page.locator('button:has-text("Create Closing")')).not.toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/admin-cannot-submit-closings.png' })
  })

  test('should NOT be able to verify closings', async ({ page }) => {
    const admin = testUsers.admin

    // Login
    await login(page, admin.email, admin.password, 'ADMIN')

    // Try to access checker features
    await page.goto('/dashboard/checker')
    await expect(page).not.toHaveURL(/\/dashboard\/checker/)

    // Take screenshot
    await page.screenshot({ path: 'test-results/admin-cannot-verify.png' })
  })

  test('should NOT be able to receive cash or create deposits', async ({ page }) => {
    const admin = testUsers.admin

    // Login
    await login(page, admin.email, admin.password, 'ADMIN')

    // Try to access audit features
    await page.goto('/dashboard/auditor')
    await expect(page).not.toHaveURL(/\/dashboard\/auditor/)

    // Verify no audit buttons
    await expect(page.locator('button:has-text("Receive Cash")')).not.toBeVisible()
    await expect(page.locator('button:has-text("Create Deposit")')).not.toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/admin-cannot-audit.png' })
  })

  test('should NOT be able to approve deposits', async ({ page }) => {
    const admin = testUsers.admin

    // Login
    await login(page, admin.email, admin.password, 'ADMIN')

    // Try to access owner features
    await page.goto('/dashboard/owner/deposits')
    await expect(page).not.toHaveURL(/\/dashboard\/owner/)

    // Take screenshot
    await page.screenshot({ path: 'test-results/admin-cannot-approve.png' })
  })

  test('should NOT be able to view reports', async ({ page }) => {
    const admin = testUsers.admin

    // Login
    await login(page, admin.email, admin.password, 'ADMIN')

    // Try to access reports
    await page.goto('/dashboard/owner/reports')
    await expect(page).not.toHaveURL(/\/dashboard\/owner/)

    // Verify no reports link
    await adminDashboard.goto()
    await expect(page.locator('a:has-text("Reports"), a:has-text("รายงาน")')).not.toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/admin-cannot-view-reports.png' })
  })

  test('should view system configuration', async ({ page }) => {
    const admin = testUsers.admin

    // Login
    await login(page, admin.email, admin.password, 'ADMIN')
    await adminDashboard.goto()

    // Navigate to settings
    await page.click('a:has-text("Settings"), a:has-text("ตั้งค่า")')
    await page.waitForLoadState('networkidle')

    // Verify settings page
    await expect(page).toHaveURL(/settings|config/)

    // Verify system config options
    await expect(page.locator('text=/Discrepancy Threshold|เกณฑ์/i')).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/admin-system-config.png' })
  })

  test('should view audit logs', async ({ page }) => {
    const admin = testUsers.admin

    // Login
    await login(page, admin.email, admin.password, 'ADMIN')
    await adminDashboard.goto()

    // Navigate to audit logs
    await page.click('a:has-text("Audit Logs"), a:has-text("ประวัติ")')
    await page.waitForLoadState('networkidle')

    // Verify audit logs
    await expect(page.locator('table, [role="table"]')).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/admin-audit-logs.png' })
  })

  test('should logout successfully', async ({ page }) => {
    const admin = testUsers.admin

    // Login
    await login(page, admin.email, admin.password, 'ADMIN')
    await adminDashboard.goto()

    // Logout
    await logout(page)

    // Verify on login page
    await expect(page).toHaveURL(/\/login/)

    // Verify cannot access dashboard
    await page.goto('/dashboard/admin')
    await expect(page).toHaveURL(/\/login/)

    // Take screenshot
    await page.screenshot({ path: 'test-results/admin-logout-success.png' })
  })
})
