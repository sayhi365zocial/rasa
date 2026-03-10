import { Page, expect } from '@playwright/test'

export class OwnerDashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard/owner')
    await this.page.waitForLoadState('networkidle')
  }

  async verifyOnDashboard() {
    await expect(this.page).toHaveURL(/\/dashboard\/owner/)
  }

  async viewAllBranches() {
    await this.page.click('a:has-text("Branches"), a:has-text("สาขา")')
    await this.page.waitForLoadState('networkidle')
  }

  async verifyBranchVisible(branchCode: string) {
    await expect(this.page.locator(`text=${branchCode}`)).toBeVisible()
  }

  async approveDeposit(depositId: string) {
    await this.page.click(`button[data-deposit-id="${depositId}"]:has-text("Approve"), button[data-deposit-id="${depositId}"]:has-text("อนุมัติ")`)
    await this.page.waitForLoadState('networkidle')
  }

  async viewReports() {
    await this.page.click('a:has-text("Reports"), a:has-text("รายงาน")')
    await this.page.waitForLoadState('networkidle')
  }

  async viewRevenue() {
    await this.page.click('a:has-text("Revenue"), a:has-text("รายได้")')
    await this.page.waitForLoadState('networkidle')
  }

  async grantManagerBranchAccess(managerEmail: string, branchCode: string) {
    await this.page.click('a:has-text("Manager Access"), a:has-text("สิทธิ์ผู้จัดการ")')
    await this.page.fill('input[name="managerEmail"]', managerEmail)
    await this.page.selectOption('select[name="branchId"]', { label: new RegExp(branchCode) })
    await this.page.click('button[type="submit"]:has-text("Grant Access")')
    await this.page.waitForLoadState('networkidle')
  }

  async verifyAccessToAllFeatures() {
    const features = [
      '/dashboard/owner/reports',
      '/dashboard/owner/deposits',
      '/dashboard/owner/branches',
      '/dashboard/owner/revenue',
    ]

    for (const feature of features) {
      await this.page.goto(feature)
      await expect(this.page).toHaveURL(feature)
    }
  }
}
