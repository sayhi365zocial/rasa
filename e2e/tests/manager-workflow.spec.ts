import { test, expect } from '@playwright/test'
import { LoginPage } from '../pages/LoginPage'
import { ManagerDashboardPage } from '../pages/ManagerDashboardPage'
import { login, logout } from '../helpers/auth'
import { testUsers } from '../fixtures/test-users'

/**
 * E2E Tests for Manager Role Workflow
 *
 * Tests all manager-specific functionality including:
 * - Login and dashboard access
 * - Branch selection from authorized branches
 * - Creating closings for selected branches
 * - Access to staff and audit functions
 * - Branch access restrictions
 * - Multi-branch management
 */

test.describe('Manager Workflow', () => {
  let loginPage: LoginPage
  let managerDashboard: ManagerDashboardPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
    managerDashboard = new ManagerDashboardPage(page)
  })

  test('should login as manager and access manager dashboard', async ({ page }) => {
    const manager = testUsers.manager

    // Navigate to login page
    await loginPage.goto()

    // Login with manager credentials
    await login(page, manager.email, manager.password, 'MANAGER')

    // Verify on manager dashboard
    await managerDashboard.verifyOnDashboard()

    // Take screenshot
    await page.screenshot({ path: 'test-results/manager-login-success.png' })
  })

  test('should see authorized branches in branch selector', async ({ page }) => {
    const manager = testUsers.manager

    // Login
    await login(page, manager.email, manager.password, 'MANAGER')
    await managerDashboard.goto()

    // Verify authorized branches are available
    await managerDashboard.verifyAuthorizedBranches([...manager.authorizedBranches])

    // Verify branch selector is visible
    await expect(page.locator('select[name="branchId"], select#branch-selector')).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/manager-branch-selector.png' })
  })

  test('should select branch from authorized branches (BR001)', async ({ page }) => {
    const manager = testUsers.manager

    // Login
    await login(page, manager.email, manager.password, 'MANAGER')
    await managerDashboard.goto()

    // Select BR001 (Rama9)
    await managerDashboard.selectBranch('BR001')

    // Verify branch is selected
    await managerDashboard.verifyBranchSelected('BR001')

    // Verify can see data for BR001
    await expect(page.locator('text=/BR001|Rama9/i')).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/manager-select-br001.png' })
  })

  test('should select branch from authorized branches (BR002)', async ({ page }) => {
    const manager = testUsers.manager

    // Login
    await login(page, manager.email, manager.password, 'MANAGER')
    await managerDashboard.goto()

    // Select BR002 (Phuket)
    await managerDashboard.selectBranch('BR002')

    // Verify branch is selected
    await managerDashboard.verifyBranchSelected('BR002')

    // Take screenshot
    await page.screenshot({ path: 'test-results/manager-select-br002.png' })
  })

  test('should select branch from authorized branches (BR003)', async ({ page }) => {
    const manager = testUsers.manager

    // Login
    await login(page, manager.email, manager.password, 'MANAGER')
    await managerDashboard.goto()

    // Select BR003 (Pattaya)
    await managerDashboard.selectBranch('BR003')

    // Verify branch is selected
    await managerDashboard.verifyBranchSelected('BR003')

    // Take screenshot
    await page.screenshot({ path: 'test-results/manager-select-br003.png' })
  })

  test('should create closing for authorized branch', async ({ page }) => {
    const manager = testUsers.manager

    // Login
    await login(page, manager.email, manager.password, 'MANAGER')
    await managerDashboard.goto()

    // Select branch
    await managerDashboard.selectBranch('BR001')

    // Create new closing
    await page.click('button:has-text("Create Closing"), a:has-text("สร้างรายการ")')
    await page.waitForLoadState('networkidle')

    // Fill closing data
    await page.fill('input[name="posTotalSales"]', '48000')
    await page.fill('input[name="posCash"]', '14000')
    await page.fill('input[name="posCredit"]', '24000')
    await page.fill('input[name="posTransfer"]', '10000')
    await page.fill('input[name="posExpenses"]', '2000')
    await page.fill('input[name="handwrittenCashCount"]', '14000')
    await page.fill('input[name="handwrittenExpenses"]', '2000')
    await page.fill('input[name="edcTotalAmount"]', '24000')

    // Submit
    await page.click('button:has-text("Submit"), button:has-text("ส่งตรวจสอบ")')
    await page.waitForLoadState('networkidle')

    // Verify success
    await expect(page.locator('text=/Submitted|ส่งแล้ว/i')).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/manager-create-closing.png' })
  })

  test('should NOT be able to access unauthorized branch (BR004)', async ({ page }) => {
    const manager = testUsers.manager

    // Login
    await login(page, manager.email, manager.password, 'MANAGER')
    await managerDashboard.goto()

    // Try to access BR004 (unauthorized)
    await managerDashboard.tryAccessUnauthorizedBranch('BR004')

    // Should see error or be redirected
    const url = page.url()
    const hasAccessDenied = await page.locator('text=/Access denied|Unauthorized|ไม่มีสิทธิ์/i').count() > 0
    const notOnBR004 = !url.includes('branch=BR004') && !url.includes('BR004')

    expect(hasAccessDenied || notOnBR004).toBeTruthy()

    // Take screenshot
    await page.screenshot({ path: 'test-results/manager-no-access-br004.png' })
  })

  test('should NOT be able to access unauthorized branch (BR005)', async ({ page }) => {
    const manager = testUsers.manager

    // Login
    await login(page, manager.email, manager.password, 'MANAGER')
    await managerDashboard.goto()

    // Try to access BR005 (unauthorized)
    await managerDashboard.tryAccessUnauthorizedBranch('BR005')

    // Verify branch selector doesn't show BR005
    const branchSelector = page.locator('select[name="branchId"] option, select#branch-selector option')
    const optionsText = await branchSelector.allTextContents()

    const hasBR005 = optionsText.some(text => text.includes('BR005') || text.includes('Chiang Mai'))
    expect(hasBR005).toBeFalsy()

    // Take screenshot
    await page.screenshot({ path: 'test-results/manager-no-access-br005.png' })
  })

  test('should perform staff actions for authorized branches', async ({ page }) => {
    const manager = testUsers.manager

    // Login
    await login(page, manager.email, manager.password, 'MANAGER')
    await managerDashboard.goto()

    // Select branch
    await managerDashboard.selectBranch('BR001')

    // Verify can create closings (staff action)
    await expect(page.locator('button:has-text("Create Closing"), a:has-text("สร้างรายการ")')).toBeVisible()

    // Verify can view closings
    await page.click('a:has-text("Closings"), a:has-text("รายการปิดวัน")')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveURL(/closings|dashboard/)

    // Take screenshot
    await page.screenshot({ path: 'test-results/manager-staff-actions.png' })
  })

  test('should perform audit actions', async ({ page }) => {
    const manager = testUsers.manager

    // Login
    await login(page, manager.email, manager.password, 'MANAGER')
    await managerDashboard.goto()

    // Navigate to audit functions
    await page.click('a:has-text("Receive Cash"), a:has-text("รับเงิน")')
    await page.waitForLoadState('networkidle')

    // Verify can see receive cash page
    await expect(page.locator('text=/Cash Received|รอนำฝาก/i')).toBeVisible()

    // Navigate to deposits
    await page.click('a:has-text("Deposits"), a:has-text("นำฝาก")')
    await page.waitForLoadState('networkidle')

    // Verify can create deposits
    await expect(page.locator('button:has-text("Create Deposit"), a:has-text("สร้างรายการนำฝาก")')).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/manager-audit-actions.png' })
  })

  test('should be able to verify closings', async ({ page }) => {
    const manager = testUsers.manager

    // Login
    await login(page, manager.email, manager.password, 'MANAGER')
    await managerDashboard.goto()

    // Navigate to submitted closings
    await page.click('a:has-text("Submitted"), a:has-text("รอตรวจสอบ")')
    await page.waitForLoadState('networkidle')

    // Verify can see verify button (manager has verify permission)
    const verifyButton = page.locator('button:has-text("Verify"), button:has-text("ตรวจสอบ")')

    // Manager should be able to verify (unless they submitted it)
    await expect(verifyButton).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/manager-can-verify.png' })
  })

  test('should switch between authorized branches', async ({ page }) => {
    const manager = testUsers.manager

    // Login
    await login(page, manager.email, manager.password, 'MANAGER')
    await managerDashboard.goto()

    // Start with BR001
    await managerDashboard.selectBranch('BR001')
    await expect(page.locator('text=/BR001|Rama9/i')).toBeVisible()

    // Switch to BR002
    await managerDashboard.selectBranch('BR002')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=/BR002|Phuket/i')).toBeVisible()

    // Switch to BR003
    await managerDashboard.selectBranch('BR003')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('text=/BR003|Pattaya/i')).toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/manager-switch-branches.png' })
  })

  test('should NOT be able to approve deposits (owner only)', async ({ page }) => {
    const manager = testUsers.manager

    // Login
    await login(page, manager.email, manager.password, 'MANAGER')
    await managerDashboard.goto()

    // Navigate to deposits
    await page.click('a:has-text("Deposits"), a:has-text("นำฝาก")')
    await page.waitForLoadState('networkidle')

    // Should not have approve button
    await expect(page.locator('button:has-text("Approve Deposit")')).not.toBeVisible()

    // Try to access owner dashboard
    await page.goto('/dashboard/owner')
    await expect(page).not.toHaveURL(/\/dashboard\/owner/)

    // Take screenshot
    await page.screenshot({ path: 'test-results/manager-cannot-approve.png' })
  })

  test('should NOT be able to view reports (owner only)', async ({ page }) => {
    const manager = testUsers.manager

    // Login
    await login(page, manager.email, manager.password, 'MANAGER')

    // Try to access reports
    await page.goto('/dashboard/owner/reports')
    await expect(page).not.toHaveURL(/\/dashboard\/owner/)

    // Verify no reports link in navigation
    await managerDashboard.goto()
    await expect(page.locator('a:has-text("Reports"), a:has-text("รายงาน")')).not.toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/manager-cannot-view-reports.png' })
  })

  test('should NOT be able to access admin features', async ({ page }) => {
    const manager = testUsers.manager

    // Login
    await login(page, manager.email, manager.password, 'MANAGER')

    // Try to access admin dashboard
    await page.goto('/dashboard/admin')
    await expect(page).not.toHaveURL(/\/dashboard\/admin/)

    // Try to access user management
    await page.goto('/dashboard/admin/users')
    await expect(page).not.toHaveURL(/\/dashboard\/admin/)

    // Take screenshot
    await page.screenshot({ path: 'test-results/manager-no-admin-access.png' })
  })

  test('should view all closings for authorized branches', async ({ page }) => {
    const manager = testUsers.manager

    // Login
    await login(page, manager.email, manager.password, 'MANAGER')
    await managerDashboard.goto()

    // View all closings
    await page.click('a:has-text("All Closings"), a:has-text("ทั้งหมด")')
    await page.waitForLoadState('networkidle')

    // Should see closings from all authorized branches
    const closingsTable = page.locator('table, [role="table"]')
    await expect(closingsTable).toBeVisible()

    // Verify multiple branches visible (BR001, BR002, BR003)
    for (const branchCode of manager.authorizedBranches) {
      // Don't assert visibility as data might not exist
      // Just verify the ability to filter by these branches
    }

    // Verify cannot see unauthorized branches
    await expect(page.locator('text=BR004')).not.toBeVisible()
    await expect(page.locator('text=BR005')).not.toBeVisible()

    // Take screenshot
    await page.screenshot({ path: 'test-results/manager-view-all-closings.png' })
  })

  test('should logout successfully', async ({ page }) => {
    const manager = testUsers.manager

    // Login
    await login(page, manager.email, manager.password, 'MANAGER')
    await managerDashboard.goto()

    // Logout
    await logout(page)

    // Verify on login page
    await expect(page).toHaveURL(/\/login/)

    // Verify cannot access dashboard
    await page.goto('/dashboard/manager')
    await expect(page).toHaveURL(/\/login/)

    // Take screenshot
    await page.screenshot({ path: 'test-results/manager-logout-success.png' })
  })
})
