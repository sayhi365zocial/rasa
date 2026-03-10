import { Page, expect } from '@playwright/test'

export class ManagerDashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard/manager')
    await this.page.waitForLoadState('networkidle')
  }

  async verifyOnDashboard() {
    await expect(this.page).toHaveURL(/\/dashboard\/manager/)
  }

  async selectBranch(branchCode: string) {
    // Find option that contains the branch code
    const options = await this.page.locator('select[name="branchId"] option, select#branch-selector option').allTextContents()
    const matchingOption = options.find(opt => opt.includes(branchCode))
    if (matchingOption) {
      await this.page.selectOption('select[name="branchId"], select#branch-selector', { label: matchingOption })
    }
    await this.page.waitForLoadState('networkidle')
  }

  async verifyBranchSelected(branchCode: string) {
    const selector = this.page.locator('select[name="branchId"], select#branch-selector')
    const selectedValue = await selector.inputValue()
    expect(selectedValue).toContain(branchCode)
  }

  async createClosingForBranch(branchCode: string) {
    await this.selectBranch(branchCode)
    await this.page.click('button:has-text("Create Closing")')
    await this.page.waitForLoadState('networkidle')
  }

  async tryAccessUnauthorizedBranch(branchCode: string) {
    await this.page.goto(`/dashboard/manager?branch=${branchCode}`)
    await this.page.waitForLoadState('networkidle')
  }

  async verifyAccessDenied() {
    await expect(
      this.page.locator('text=/Access denied|Unauthorized|ไม่มีสิทธิ์เข้าถึง/i')
    ).toBeVisible()
  }

  async verifyAuthorizedBranches(branches: string[]) {
    const selector = this.page.locator('select[name="branchId"] option, select#branch-selector option')
    const options = await selector.allTextContents()

    for (const branch of branches) {
      expect(options.some(opt => opt.includes(branch))).toBeTruthy()
    }
  }

  async performStaffActions() {
    // Manager should be able to do staff tasks
    await this.page.click('a:has-text("Create Closing")')
    await expect(this.page).toHaveURL(/\/closings\/new|\/create/)
  }

  async performAuditActions() {
    // Manager should be able to do audit tasks
    await this.page.click('a:has-text("Receive Cash"), a:has-text("รับเงิน")')
    await this.page.waitForLoadState('networkidle')
  }
}
