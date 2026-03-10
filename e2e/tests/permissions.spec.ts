import { test, expect } from '@playwright/test'
import { LoginPage } from '../pages/LoginPage'
import { login } from '../helpers/auth'
import { testUsers } from '../fixtures/test-users'

/**
 * E2E Tests for Cross-Role Permissions
 *
 * Tests permission boundaries across different roles:
 * - Staff cannot verify closings
 * - Checker cannot verify own submissions
 * - Manager respects branch access
 * - Admin blocked from operations
 * - Owner has full access
 * - Role-based route protection
 */

test.describe('Cross-Role Permissions', () => {
  let loginPage: LoginPage

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page)
  })

  test.describe('Staff Permission Boundaries', () => {
    test('staff cannot verify closings', async ({ page }) => {
      const staff = testUsers.staff.rama9

      await login(page, staff.email, staff.password, 'STAFF')

      // Try to access verify functionality
      await page.goto('/dashboard/checker')
      await expect(page).not.toHaveURL(/\/dashboard\/checker/)

      // Verify no verify button exists
      await expect(page.locator('button:has-text("Verify Closing")')).not.toBeVisible()
    })

    test('staff cannot receive cash', async ({ page }) => {
      const staff = testUsers.staff.rama9

      await login(page, staff.email, staff.password, 'STAFF')

      // Try to access audit features
      await page.goto('/dashboard/auditor')
      await expect(page).not.toHaveURL(/\/dashboard\/auditor/)
    })

    test('staff cannot create deposits', async ({ page }) => {
      const staff = testUsers.staff.rama9

      await login(page, staff.email, staff.password, 'STAFF')

      // Verify no create deposit button
      await expect(page.locator('button:has-text("Create Deposit")')).not.toBeVisible()
    })

    test('staff cannot access other branches', async ({ page }) => {
      const staff = testUsers.staff.rama9

      await login(page, staff.email, staff.password, 'STAFF')

      // Try to access BR002 data
      await page.goto('/dashboard/staff?branch=BR002')

      // Should be redirected or see error
      const url = page.url()
      const hasError = await page.locator('text=/Access denied|Unauthorized/i').count() > 0

      expect(hasError || !url.includes('BR002')).toBeTruthy()
    })

    test('staff cannot approve deposits', async ({ page }) => {
      const staff = testUsers.staff.rama9

      await login(page, staff.email, staff.password, 'STAFF')

      // Try to access owner features
      await page.goto('/dashboard/owner/deposits')
      await expect(page).not.toHaveURL(/\/dashboard\/owner/)
    })
  })

  test.describe('Checker Permission Boundaries', () => {
    test('checker cannot verify own submission', async ({ page }) => {
      const checker = testUsers.checker

      await login(page, checker.email, checker.password)

      // Create a closing as checker
      await page.click('a:has-text("Create Closing")')
      await page.waitForLoadState('networkidle')

      await page.fill('input[name="posTotalSales"]', '30000')
      await page.fill('input[name="posCash"]', '10000')
      await page.fill('input[name="posCredit"]', '15000')
      await page.fill('input[name="posTransfer"]', '5000')
      await page.fill('input[name="posExpenses"]', '1000')
      await page.fill('input[name="handwrittenCashCount"]', '10000')
      await page.fill('input[name="handwrittenExpenses"]', '1000')
      await page.fill('input[name="edcTotalAmount"]', '15000')

      await page.click('button:has-text("Submit")')
      await page.waitForLoadState('networkidle')

      // Try to verify own submission
      await page.click('a:has-text("Submitted")')
      await page.waitForLoadState('networkidle')

      const ownClosing = page.locator('tr:has-text("checker")').first()
      if (await ownClosing.count() > 0) {
        const verifyButton = ownClosing.locator('button:has-text("Verify")')

        if (await verifyButton.count() > 0) {
          await verifyButton.click()

          // Should see error
          await expect(
            page.locator('text=/Cannot verify own|ไม่สามารถตรวจสอบรายการของตนเอง/i')
          ).toBeVisible()
        }
      }
    })

    test('checker cannot access admin features', async ({ page }) => {
      const checker = testUsers.checker

      await login(page, checker.email, checker.password)

      await page.goto('/dashboard/admin/users')
      await expect(page).not.toHaveURL(/\/dashboard\/admin/)
    })

    test('checker cannot approve deposits', async ({ page }) => {
      const checker = testUsers.checker

      await login(page, checker.email, checker.password)

      await page.goto('/dashboard/owner/deposits')
      await expect(page).not.toHaveURL(/\/dashboard\/owner/)
    })
  })

  test.describe('Audit Permission Boundaries', () => {
    test('audit cannot submit closings', async ({ page }) => {
      const auditor = testUsers.auditor

      await login(page, auditor.email, auditor.password, 'AUDIT')

      await page.goto('/dashboard/staff/closings/new')
      await expect(page).not.toHaveURL(/\/dashboard\/staff/)
    })

    test('audit cannot verify closings', async ({ page }) => {
      const auditor = testUsers.auditor

      await login(page, auditor.email, auditor.password, 'AUDIT')

      // Should not have verify button
      await expect(page.locator('button:has-text("Verify Closing")')).not.toBeVisible()
    })

    test('audit cannot approve deposits', async ({ page }) => {
      const auditor = testUsers.auditor

      await login(page, auditor.email, auditor.password, 'AUDIT')

      await page.goto('/dashboard/owner/deposits')
      await expect(page).not.toHaveURL(/\/dashboard\/owner/)
    })
  })

  test.describe('Manager Branch Access Restrictions', () => {
    test('manager can access authorized branches only', async ({ page }) => {
      const manager = testUsers.manager

      await login(page, manager.email, manager.password, 'MANAGER')

      // Check branch selector
      const branchSelector = page.locator('select[name="branchId"] option')
      const options = await branchSelector.allTextContents()

      // Should have BR001, BR002, BR003
      for (const branch of manager.authorizedBranches) {
        expect(options.some(opt => opt.includes(branch))).toBeTruthy()
      }

      // Should NOT have BR004, BR005
      for (const branch of manager.unauthorizedBranches) {
        expect(options.some(opt => opt.includes(branch))).toBeFalsy()
      }
    })

    test('manager cannot access unauthorized branch BR004', async ({ page }) => {
      const manager = testUsers.manager

      await login(page, manager.email, manager.password, 'MANAGER')

      await page.goto('/dashboard/manager?branch=BR004')
      await page.waitForLoadState('networkidle')

      // Should see error or not have BR004 data
      const hasError = await page.locator('text=/Access denied|Unauthorized/i').count() > 0
      const url = page.url()

      expect(hasError || !url.includes('BR004')).toBeTruthy()
    })

    test('manager cannot access unauthorized branch BR005', async ({ page }) => {
      const manager = testUsers.manager

      await login(page, manager.email, manager.password, 'MANAGER')

      await page.goto('/dashboard/manager?branch=BR005')
      await page.waitForLoadState('networkidle')

      const hasError = await page.locator('text=/Access denied|Unauthorized/i').count() > 0
      const url = page.url()

      expect(hasError || !url.includes('BR005')).toBeTruthy()
    })

    test('manager cannot approve deposits', async ({ page }) => {
      const manager = testUsers.manager

      await login(page, manager.email, manager.password, 'MANAGER')

      await page.goto('/dashboard/owner/deposits')
      await expect(page).not.toHaveURL(/\/dashboard\/owner/)
    })

    test('manager cannot view reports', async ({ page }) => {
      const manager = testUsers.manager

      await login(page, manager.email, manager.password, 'MANAGER')

      await page.goto('/dashboard/owner/reports')
      await expect(page).not.toHaveURL(/\/dashboard\/owner/)
    })
  })

  test.describe('Admin Operation Restrictions', () => {
    test('admin blocked from submitting closings', async ({ page }) => {
      const admin = testUsers.admin

      await login(page, admin.email, admin.password, 'ADMIN')

      await page.goto('/dashboard/staff/closings/new')
      await expect(page).not.toHaveURL(/\/dashboard\/staff/)
    })

    test('admin blocked from verifying closings', async ({ page }) => {
      const admin = testUsers.admin

      await login(page, admin.email, admin.password, 'ADMIN')

      await page.goto('/dashboard/checker')
      await expect(page).not.toHaveURL(/\/dashboard\/checker/)
    })

    test('admin blocked from receiving cash', async ({ page }) => {
      const admin = testUsers.admin

      await login(page, admin.email, admin.password, 'ADMIN')

      await page.goto('/dashboard/auditor')
      await expect(page).not.toHaveURL(/\/dashboard\/auditor/)
    })

    test('admin blocked from creating deposits', async ({ page }) => {
      const admin = testUsers.admin

      await login(page, admin.email, admin.password, 'ADMIN')

      await expect(page.locator('button:has-text("Create Deposit")')).not.toBeVisible()
    })

    test('admin blocked from approving deposits', async ({ page }) => {
      const admin = testUsers.admin

      await login(page, admin.email, admin.password, 'ADMIN')

      await page.goto('/dashboard/owner/deposits')
      await expect(page).not.toHaveURL(/\/dashboard\/owner/)
    })

    test('admin blocked from viewing reports', async ({ page }) => {
      const admin = testUsers.admin

      await login(page, admin.email, admin.password, 'ADMIN')

      await page.goto('/dashboard/owner/reports')
      await expect(page).not.toHaveURL(/\/dashboard\/owner/)
    })
  })

  test.describe('Owner Full Access', () => {
    test('owner has access to all branches', async ({ page }) => {
      const owner = testUsers.owner

      await login(page, owner.email, owner.password, 'OWNER')

      // Try accessing different branches
      const branches = ['BR001', 'BR002', 'BR003', 'BR004', 'BR005']

      for (const branch of branches) {
        await page.goto(`/dashboard/owner?branch=${branch}`)
        await page.waitForLoadState('networkidle')

        // Should not see access denied
        const hasError = await page.locator('text=/Access denied/i').count() > 0
        expect(hasError).toBeFalsy()
      }
    })

    test('owner can submit closings', async ({ page }) => {
      const owner = testUsers.owner

      await login(page, owner.email, owner.password, 'OWNER')

      await page.click('a:has-text("Create Closing")')
      await page.waitForLoadState('networkidle')

      await expect(page).toHaveURL(/closings\/new|create/)
    })

    test('owner can verify closings', async ({ page }) => {
      const owner = testUsers.owner

      await login(page, owner.email, owner.password, 'OWNER')

      await page.click('a:has-text("Submitted")')
      await page.waitForLoadState('networkidle')

      // Should have verify button
      await expect(page.locator('button:has-text("Verify")')).toBeVisible()
    })

    test('owner can receive cash', async ({ page }) => {
      const owner = testUsers.owner

      await login(page, owner.email, owner.password, 'OWNER')

      await page.click('a:has-text("Receive Cash")')
      await page.waitForLoadState('networkidle')

      await expect(page.locator('text=/Cash Received|รับเงิน/i')).toBeVisible()
    })

    test('owner can create deposits', async ({ page }) => {
      const owner = testUsers.owner

      await login(page, owner.email, owner.password, 'OWNER')

      // Should have create deposit functionality
      await expect(page.locator('button:has-text("Create Deposit"), a:has-text("Create Deposit")')).toBeVisible()
    })

    test('owner can approve deposits', async ({ page }) => {
      const owner = testUsers.owner

      await login(page, owner.email, owner.password, 'OWNER')

      await page.goto('/dashboard/owner/deposits')
      await expect(page).toHaveURL(/\/dashboard\/owner/)

      // Should have approve button
      await expect(page.locator('button:has-text("Approve")')).toBeVisible()
    })

    test('owner can view reports', async ({ page }) => {
      const owner = testUsers.owner

      await login(page, owner.email, owner.password, 'OWNER')

      await page.goto('/dashboard/owner/reports')
      await expect(page).toHaveURL(/\/dashboard\/owner\/reports/)
    })

    test('owner can manage users (like admin)', async ({ page }) => {
      const owner = testUsers.owner

      await login(page, owner.email, owner.password, 'OWNER')

      await page.click('a:has-text("Users"), a:has-text("ผู้ใช้")')
      await page.waitForLoadState('networkidle')

      // Should see users list
      await expect(page.locator('table, [role="table"]')).toBeVisible()
    })

    test('owner can grant manager access', async ({ page }) => {
      const owner = testUsers.owner

      await login(page, owner.email, owner.password, 'OWNER')

      await page.click('a:has-text("Manager Access")')
      await page.waitForLoadState('networkidle')

      // Should have grant access functionality
      await expect(page.locator('button:has-text("Grant Access")')).toBeVisible()
    })
  })

  test.describe('Route Protection', () => {
    test('unauthenticated user redirected to login', async ({ page }) => {
      // Try to access dashboard without login
      await page.goto('/dashboard/staff')

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/)
    })

    test('staff cannot access /dashboard/admin', async ({ page }) => {
      const staff = testUsers.staff.rama9

      await login(page, staff.email, staff.password, 'STAFF')
      await page.goto('/dashboard/admin')

      await expect(page).not.toHaveURL(/\/dashboard\/admin/)
    })

    test('admin cannot access /dashboard/staff', async ({ page }) => {
      const admin = testUsers.admin

      await login(page, admin.email, admin.password, 'ADMIN')
      await page.goto('/dashboard/staff')

      await expect(page).not.toHaveURL(/\/dashboard\/staff/)
    })

    test('staff cannot access /dashboard/owner', async ({ page }) => {
      const staff = testUsers.staff.rama9

      await login(page, staff.email, staff.password, 'STAFF')
      await page.goto('/dashboard/owner')

      await expect(page).not.toHaveURL(/\/dashboard\/owner/)
    })

    test('manager cannot access /dashboard/owner', async ({ page }) => {
      const manager = testUsers.manager

      await login(page, manager.email, manager.password, 'MANAGER')
      await page.goto('/dashboard/owner')

      await expect(page).not.toHaveURL(/\/dashboard\/owner/)
    })
  })

  test.describe('API Endpoint Protection', () => {
    test('staff cannot call admin API endpoints', async ({ page }) => {
      const staff = testUsers.staff.rama9

      await login(page, staff.email, staff.password, 'STAFF')

      // Try to call admin API
      const response = await page.request.post('/api/admin/users', {
        data: {
          email: 'test@test.com',
          role: 'STAFF',
        },
      })

      // Should be forbidden
      expect([401, 403]).toContain(response.status())
    })

    test('admin cannot call operational API endpoints', async ({ page }) => {
      const admin = testUsers.admin

      await login(page, admin.email, admin.password, 'ADMIN')

      // Try to create closing
      const response = await page.request.post('/api/closings', {
        data: {
          posTotalSales: 50000,
        },
      })

      // Should be forbidden
      expect([401, 403]).toContain(response.status())
    })

    test('staff cannot approve deposits via API', async ({ page }) => {
      const staff = testUsers.staff.rama9

      await login(page, staff.email, staff.password, 'STAFF')

      // Try to approve deposit
      const response = await page.request.patch('/api/deposits/test-id/approve', {
        data: {
          approvalStatus: 'APPROVED',
        },
      })

      // Should be forbidden
      expect([401, 403]).toContain(response.status())
    })
  })
})
