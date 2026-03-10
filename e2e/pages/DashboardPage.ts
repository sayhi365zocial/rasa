import { Page, Locator, expect } from '@playwright/test'

/**
 * Dashboard Page Object Model
 * Encapsulates all interactions with dashboard pages for all roles
 */
export class DashboardPage {
  readonly page: Page

  // Common locators across all dashboards
  readonly pageTitle: Locator
  readonly logoutButton: Locator
  readonly navigationMenu: Locator
  readonly userProfile: Locator
  readonly branchInfo: Locator

  // Action buttons
  readonly createNewButton: Locator
  readonly viewDepositsButton: Locator
  readonly viewClosingsButton: Locator

  constructor(page: Page) {
    this.page = page

    // Initialize common locators
    this.pageTitle = page.locator('h1, h2').first()
    this.logoutButton = page.locator('button:has-text("ออกจากระบบ"), a:has-text("ออกจากระบบ")')
    this.navigationMenu = page.locator('nav')
    this.userProfile = page.locator('[data-testid="user-profile"]')
    this.branchInfo = page.locator('[data-testid="branch-info"]')

    // Action buttons (these may vary by role)
    this.createNewButton = page.locator('button:has-text("สร้างรายการปิดยอด"), a:has-text("สร้างรายการปิดยอด")')
    this.viewDepositsButton = page.locator('a:has-text("ฝากเงิน")')
    this.viewClosingsButton = page.locator('a:has-text("ปิดยอด")')
  }

  /**
   * Navigate to staff dashboard
   */
  async gotoStaffDashboard() {
    await this.page.goto('/dashboard/staff')
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Navigate to auditor dashboard
   */
  async gotoAuditorDashboard() {
    await this.page.goto('/dashboard/auditor')
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Navigate to manager dashboard
   */
  async gotoManagerDashboard() {
    await this.page.goto('/dashboard/manager')
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Navigate to owner dashboard
   */
  async gotoOwnerDashboard() {
    await this.page.goto('/dashboard/owner')
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Navigate to admin dashboard
   */
  async gotoAdminDashboard() {
    await this.page.goto('/dashboard/admin')
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Navigate to dashboard by role
   */
  async gotoDashboardByRole(role: 'STAFF' | 'AUDIT' | 'MANAGER' | 'OWNER' | 'ADMIN') {
    const rolePathMap = {
      STAFF: '/dashboard/staff',
      AUDIT: '/dashboard/auditor',
      MANAGER: '/dashboard/manager',
      OWNER: '/dashboard/owner',
      ADMIN: '/dashboard/admin',
    }

    await this.page.goto(rolePathMap[role])
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Verify dashboard is loaded
   */
  async verifyPageLoaded() {
    await expect(this.pageTitle).toBeVisible()
  }

  /**
   * Click on create new closing button
   */
  async clickCreateNewClosing() {
    await this.createNewButton.click()
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Check if create new closing button is visible
   */
  async isCreateNewClosingVisible(): Promise<boolean> {
    return await this.createNewButton.isVisible()
  }

  /**
   * Get page title text
   */
  async getPageTitle(): Promise<string> {
    return await this.pageTitle.textContent() || ''
  }

  /**
   * Logout from dashboard
   */
  async logout() {
    await this.logoutButton.click()
    await this.page.waitForURL('**/login', { timeout: 5000 })
  }

  /**
   * Check if user is on correct dashboard
   */
  async verifyCurrentDashboard(role: 'STAFF' | 'AUDIT' | 'MANAGER' | 'OWNER' | 'ADMIN') {
    const rolePathMap = {
      STAFF: '/dashboard/staff',
      AUDIT: '/dashboard/auditor',
      MANAGER: '/dashboard/manager',
      OWNER: '/dashboard/owner',
      ADMIN: '/dashboard/admin',
    }

    await expect(this.page).toHaveURL(rolePathMap[role])
  }

  /**
   * Navigate to closings page (Staff Dashboard)
   */
  async navigateToClosings() {
    const closingsLink = this.page.locator('a[href*="/closings"]').first()
    await closingsLink.click()
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Navigate to deposits page
   */
  async navigateToDeposits() {
    const depositsLink = this.page.locator('a[href*="/deposits"]').first()
    await depositsLink.click()
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Get all closing records displayed on dashboard
   */
  async getClosingRecords() {
    const closingRows = this.page.locator('[data-testid="closing-row"], tbody tr')
    const count = await closingRows.count()

    const records = []
    for (let i = 0; i < count; i++) {
      const row = closingRows.nth(i)
      const text = await row.textContent()
      records.push(text)
    }

    return records
  }

  /**
   * Click on a specific closing record
   * @param index - Row index (0-based)
   */
  async clickClosingRecord(index: number = 0) {
    const closingRows = this.page.locator('[data-testid="closing-row"], tbody tr')
    await closingRows.nth(index).click()
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Search for a closing by date
   * @param date - Date in YYYY-MM-DD format
   */
  async searchClosingByDate(date: string) {
    const searchInput = this.page.locator('input[type="search"], input[placeholder*="ค้นหา"]')
    await searchInput.fill(date)
    await this.page.waitForTimeout(500) // Wait for search results
  }

  /**
   * Get statistics displayed on dashboard
   */
  async getDashboardStats(): Promise<{
    totalSales?: string
    pendingClosings?: string
    completedDeposits?: string
  }> {
    const stats: any = {}

    // Try to extract statistics from cards/widgets
    const statCards = this.page.locator('[data-testid="stat-card"]')
    const count = await statCards.count()

    for (let i = 0; i < count; i++) {
      const card = statCards.nth(i)
      const label = await card.locator('[data-testid="stat-label"]').textContent()
      const value = await card.locator('[data-testid="stat-value"]').textContent()

      if (label && value) {
        stats[label.toLowerCase().replace(/\s+/g, '')] = value
      }
    }

    return stats
  }

  /**
   * Take screenshot of dashboard
   */
  async takeScreenshot(name: string = 'dashboard') {
    await this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: true })
  }

  /**
   * Wait for data to load
   */
  async waitForDataLoad() {
    // Wait for loading spinner to disappear
    const loader = this.page.locator('[data-testid="loader"], .animate-spin')
    try {
      await loader.waitFor({ state: 'hidden', timeout: 10000 })
    } catch {
      // Loader might not exist, which is fine
    }

    await this.page.waitForLoadState('networkidle')
  }

  /**
   * Check if no data message is displayed
   */
  async hasNoDataMessage(): Promise<boolean> {
    const noDataText = this.page.locator('text=/ไม่พบข้อมูล|No data|Empty/')
    try {
      await noDataText.waitFor({ state: 'visible', timeout: 2000 })
      return true
    } catch {
      return false
    }
  }

  /**
   * Navigate using breadcrumb
   * @param breadcrumbText - Text of breadcrumb to click
   */
  async clickBreadcrumb(breadcrumbText: string) {
    const breadcrumb = this.page.locator(`nav a:has-text("${breadcrumbText}")`)
    await breadcrumb.click()
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Verify navigation menu items for role
   * @param expectedItems - Expected menu item texts
   */
  async verifyNavigationItems(expectedItems: string[]) {
    for (const item of expectedItems) {
      const menuItem = this.page.locator(`nav a:has-text("${item}"), nav button:has-text("${item}")`)
      await expect(menuItem).toBeVisible()
    }
  }
}
