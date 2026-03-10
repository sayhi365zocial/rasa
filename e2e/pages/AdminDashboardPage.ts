import { Page, expect } from '@playwright/test'

export class AdminDashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard/admin')
    await this.page.waitForLoadState('networkidle')
  }

  async verifyOnDashboard() {
    await expect(this.page).toHaveURL(/\/dashboard\/admin/)
  }

  async manageUsers() {
    await this.page.click('a:has-text("Users"), a:has-text("ผู้ใช้งาน")')
    await this.page.waitForLoadState('networkidle')
  }

  async createUser(data: {
    email: string
    username: string
    firstName: string
    lastName: string
    role: string
    branchId?: string
  }) {
    await this.page.click('button:has-text("Create User"), button:has-text("สร้างผู้ใช้")')

    await this.page.fill('input[name="email"]', data.email)
    await this.page.fill('input[name="username"]', data.username)
    await this.page.fill('input[name="firstName"]', data.firstName)
    await this.page.fill('input[name="lastName"]', data.lastName)
    await this.page.selectOption('select[name="role"]', data.role)

    if (data.branchId) {
      await this.page.selectOption('select[name="branchId"]', data.branchId)
    }

    await this.page.click('button[type="submit"]:has-text("Create")')
    await this.page.waitForLoadState('networkidle')
  }

  async editUser(userId: string, updates: any) {
    await this.page.click(`button[data-user-id="${userId}"]:has-text("Edit")`)
    // Fill edit form
    await this.page.waitForLoadState('networkidle')
  }

  async deleteUser(userId: string) {
    await this.page.click(`button[data-user-id="${userId}"]:has-text("Delete")`)
    // Confirm deletion
    await this.page.click('button:has-text("Confirm")')
    await this.page.waitForLoadState('networkidle')
  }

  async manageBranches() {
    await this.page.click('a:has-text("Branches"), a:has-text("สาขา")')
    await this.page.waitForLoadState('networkidle')
  }

  async manageBankAccounts() {
    await this.page.click('a:has-text("Bank Accounts"), a:has-text("บัญชีธนาคาร")')
    await this.page.waitForLoadState('networkidle')
  }

  async verifyCannotAccessOperations() {
    // Try to access closing operations
    await this.page.goto('/dashboard/staff/closings/new')
    await expect(this.page).not.toHaveURL(/\/dashboard\/staff/)

    // Try to access audit operations
    await this.page.goto('/dashboard/auditor')
    await expect(this.page).not.toHaveURL(/\/dashboard\/auditor/)
  }

  async verifyCannotViewReports() {
    await this.page.goto('/dashboard/owner/reports')
    await expect(this.page).not.toHaveURL(/\/dashboard\/owner/)
  }
}
