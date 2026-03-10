import { Page, expect } from '@playwright/test'

export class CheckerDashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard/checker')
    await this.page.waitForLoadState('networkidle')
  }

  async verifyOnDashboard() {
    await expect(this.page).toHaveURL(/\/dashboard\/checker/)
  }

  async viewSubmittedClosings() {
    await this.page.click('a:has-text("Submitted Closings"), a:has-text("รอตรวจสอบ")')
    await this.page.waitForLoadState('networkidle')
  }

  async verifyClosing(closingId: string) {
    await this.page.click(`button[data-closing-id="${closingId}"]:has-text("Verify"), button[data-closing-id="${closingId}"]:has-text("ตรวจสอบ")`)
    await this.page.waitForLoadState('networkidle')
  }

  async verifyOwnSubmissionError() {
    await expect(
      this.page.locator('text=/Cannot verify own submission|ไม่สามารถตรวจสอบรายการของตนเอง/i')
    ).toBeVisible()
  }

  async verifyCannotAccessAdminFeatures() {
    // Try to access admin features
    await this.page.goto('/dashboard/admin/users')
    await expect(this.page).not.toHaveURL(/\/dashboard\/admin/)
  }
}
