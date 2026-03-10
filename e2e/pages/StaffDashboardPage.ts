import { Page, expect } from '@playwright/test'

export class StaffDashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard/staff')
    await this.page.waitForLoadState('networkidle')
  }

  async verifyOnDashboard() {
    await expect(this.page).toHaveURL(/\/dashboard\/staff/)
  }

  async clickCreateClosing() {
    await this.page.click('button:has-text("Create Daily Closing"), a:has-text("สร้างรายการปิดวัน")')
    await this.page.waitForLoadState('networkidle')
  }

  async createNewDailyClosing(data: {
    posTotalSales: number
    posCash: number
    posCredit: number
    posTransfer: number
    posExpenses: number
    handwrittenCashCount: number
    handwrittenExpenses: number
    edcTotalAmount: number
  }) {
    // Fill POS data
    await this.page.fill('input[name="posTotalSales"]', data.posTotalSales.toString())
    await this.page.fill('input[name="posCash"]', data.posCash.toString())
    await this.page.fill('input[name="posCredit"]', data.posCredit.toString())
    await this.page.fill('input[name="posTransfer"]', data.posTransfer.toString())
    await this.page.fill('input[name="posExpenses"]', data.posExpenses.toString())

    // Fill handwritten data
    await this.page.fill('input[name="handwrittenCashCount"]', data.handwrittenCashCount.toString())
    await this.page.fill('input[name="handwrittenExpenses"]', data.handwrittenExpenses.toString())

    // Fill EDC data
    await this.page.fill('input[name="edcTotalAmount"]', data.edcTotalAmount.toString())
  }

  async submitClosing() {
    await this.page.click('button:has-text("Submit"), button:has-text("ส่งตรวจสอบ")')
    await this.page.waitForLoadState('networkidle')
  }

  async viewOwnClosings() {
    await this.page.click('a:has-text("My Closings"), a:has-text("รายการของฉัน")')
    await this.page.waitForLoadState('networkidle')
  }

  async verifyClosingVisible(closingId: string) {
    await expect(this.page.locator(`[data-closing-id="${closingId}"]`)).toBeVisible()
  }

  async verifyClosingNotVisible(closingId: string) {
    await expect(this.page.locator(`[data-closing-id="${closingId}"]`)).not.toBeVisible()
  }

  async confirmBankDeposit(depositId: string) {
    await this.page.click(`button[data-deposit-id="${depositId}"]:has-text("Confirm")`)
    await this.page.waitForLoadState('networkidle')
  }

  async verifyCannotAccessOtherBranch() {
    // Try to navigate to another branch's data
    await this.page.goto('/dashboard/staff?branch=BR002')
    // Should either redirect back or show error
    await expect(
      this.page.locator('text=/Access denied|ไม่มีสิทธิ์เข้าถึง|unauthorized/i')
    ).toBeVisible({ timeout: 5000 })
  }
}
