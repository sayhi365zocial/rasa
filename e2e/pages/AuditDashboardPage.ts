import { Page, expect } from '@playwright/test'

export class AuditDashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard/auditor')
    await this.page.waitForLoadState('networkidle')
  }

  async verifyOnDashboard() {
    await expect(this.page).toHaveURL(/\/dashboard\/auditor/)
  }

  async viewVerifiedClosings() {
    await this.page.click('a:has-text("Verified Closings"), a:has-text("รอรับเงิน")')
    await this.page.waitForLoadState('networkidle')
  }

  async receiveCash(closingId: string) {
    await this.page.click(`button[data-closing-id="${closingId}"]:has-text("Receive Cash"), button[data-closing-id="${closingId}"]:has-text("รับเงิน")`)
    await this.page.waitForLoadState('networkidle')
  }

  async createDeposit(data: {
    closingId: string
    depositAmount: number
    bankName: string
    accountNumber: string
    depositSlipUrl?: string
  }) {
    await this.page.click(`button[data-closing-id="${data.closingId}"]:has-text("Create Deposit"), button[data-closing-id="${data.closingId}"]:has-text("สร้างรายการนำฝาก")`)

    await this.page.fill('input[name="depositAmount"]', data.depositAmount.toString())
    await this.page.selectOption('select[name="bankName"]', data.bankName)
    await this.page.fill('input[name="accountNumber"]', data.accountNumber)

    if (data.depositSlipUrl) {
      await this.page.fill('input[name="depositSlipUrl"]', data.depositSlipUrl)
    }

    await this.page.click('button[type="submit"]:has-text("Create"), button[type="submit"]:has-text("สร้าง")')
    await this.page.waitForLoadState('networkidle')
  }

  async viewDepositStatus() {
    await this.page.click('a:has-text("Deposits"), a:has-text("รายการนำฝาก")')
    await this.page.waitForLoadState('networkidle')
  }

  async verifyCannotSubmitClosing() {
    await this.page.goto('/dashboard/staff/closings/new')
    // Should be redirected or see error
    await expect(this.page).not.toHaveURL(/\/dashboard\/staff/)
  }

  async verifyCannotVerifyClosing() {
    // Audit role should not have verify button
    await expect(
      this.page.locator('button:has-text("Verify Closing")')
    ).not.toBeVisible()
  }
}
