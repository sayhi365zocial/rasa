import { Page, Locator, expect } from '@playwright/test'

/**
 * Login Page Object Model
 * Encapsulates all interactions with the login page
 */
export class LoginPage {
  readonly page: Page

  // Locators
  readonly identifierInput: Locator
  readonly passwordInput: Locator
  readonly loginButton: Locator
  readonly errorMessage: Locator
  readonly logoContainer: Locator
  readonly demoAccountsSection: Locator

  constructor(page: Page) {
    this.page = page

    // Initialize locators
    this.identifierInput = page.locator('#identifier')
    this.passwordInput = page.locator('#password')
    this.loginButton = page.locator('button[type="submit"]')
    this.errorMessage = page.locator('.bg-red-50, .text-red-700')
    this.logoContainer = page.locator('.bg-blue-600.text-white.rounded-lg')
    this.demoAccountsSection = page.locator('text=ทดสอบระบบ (Demo Accounts)')
  }

  /**
   * Navigate to login page
   */
  async goto() {
    await this.page.goto('/login')
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * Perform login with credentials
   * @param identifier - Email or username
   * @param password - Password
   */
  async login(identifier: string, password: string) {
    await this.identifierInput.fill(identifier)
    await this.passwordInput.fill(password)
    await this.loginButton.click()

    // Wait for navigation after login
    await this.page.waitForURL(/\/dashboard/, { timeout: 10000 })
  }

  /**
   * Perform login and wait for specific role dashboard
   * @param identifier - Email or username
   * @param password - Password
   * @param expectedRole - Expected role for redirect verification
   */
  async loginWithRole(
    identifier: string,
    password: string,
    expectedRole: 'STAFF' | 'AUDIT' | 'MANAGER' | 'OWNER' | 'ADMIN'
  ) {
    await this.login(identifier, password)

    // Map roles to expected paths
    const rolePathMap = {
      STAFF: '/dashboard/staff',
      AUDIT: '/dashboard/auditor',
      MANAGER: '/dashboard/manager',
      OWNER: '/dashboard/owner',
      ADMIN: '/dashboard/admin',
    }

    const expectedPath = rolePathMap[expectedRole]
    await expect(this.page).toHaveURL(expectedPath, { timeout: 5000 })
  }

  /**
   * Submit login form (without waiting for navigation)
   * Useful for testing error cases
   */
  async submitLogin(identifier: string, password: string) {
    await this.identifierInput.fill(identifier)
    await this.passwordInput.fill(password)
    await this.loginButton.click()
  }

  /**
   * Get error message text
   */
  async getErrorMessage(): Promise<string> {
    await this.errorMessage.waitFor({ state: 'visible', timeout: 5000 })
    return await this.errorMessage.textContent() || ''
  }

  /**
   * Check if error message is displayed
   */
  async hasErrorMessage(): Promise<boolean> {
    try {
      await this.errorMessage.waitFor({ state: 'visible', timeout: 2000 })
      return true
    } catch {
      return false
    }
  }

  /**
   * Verify login page is loaded
   */
  async verifyPageLoaded() {
    await expect(this.logoContainer).toBeVisible()
    await expect(this.identifierInput).toBeVisible()
    await expect(this.passwordInput).toBeVisible()
    await expect(this.loginButton).toBeVisible()
  }

  /**
   * Verify page title and branding
   */
  async verifyBranding() {
    const title = this.page.locator('h1:has-text("MerMed Pharma")')
    await expect(title).toBeVisible()

    const subtitle = this.page.locator('text=Pharmacy Sales Audit System')
    await expect(subtitle).toBeVisible()
  }

  /**
   * Check if demo accounts section is visible
   */
  async isDemoAccountsSectionVisible(): Promise<boolean> {
    return await this.demoAccountsSection.isVisible()
  }

  /**
   * Click on a specific demo account
   * @param role - Role of demo account (staff, auditor, manager, owner, admin)
   */
  async selectDemoAccount(role: 'staff' | 'auditor' | 'manager' | 'owner' | 'admin') {
    const roleTextMap = {
      staff: 'Store Staff',
      auditor: 'Auditor',
      manager: 'Manager',
      owner: 'Owner',
      admin: 'Admin',
    }

    const demoAccountText = roleTextMap[role]
    const demoAccount = this.page.locator(`text=${demoAccountText}`).first()
    await demoAccount.click()
  }

  /**
   * Get the placeholder text for identifier input
   */
  async getIdentifierPlaceholder(): Promise<string> {
    return (await this.identifierInput.getAttribute('placeholder')) || ''
  }

  /**
   * Check if login button is disabled
   */
  async isLoginButtonDisabled(): Promise<boolean> {
    return await this.loginButton.isDisabled()
  }

  /**
   * Check if loading state is displayed
   */
  async isLoading(): Promise<boolean> {
    const loadingText = this.page.locator('text=กำลังเข้าสู่ระบบ...')
    return await loadingText.isVisible()
  }

  /**
   * Clear all input fields
   */
  async clearInputs() {
    await this.identifierInput.clear()
    await this.passwordInput.clear()
  }

  /**
   * Fill identifier only
   */
  async fillIdentifier(identifier: string) {
    await this.identifierInput.fill(identifier)
  }

  /**
   * Fill password only
   */
  async fillPassword(password: string) {
    await this.passwordInput.fill(password)
  }

  /**
   * Take screenshot of login page
   */
  async takeScreenshot(name: string = 'login-page') {
    await this.page.screenshot({ path: `screenshots/${name}.png`, fullPage: true })
  }

  /**
   * Verify footer version
   */
  async verifyFooterVersion() {
    const footer = this.page.locator('text=/v\\d+\\.\\d+ © \\d{4} MerMed Pharma/')
    await expect(footer).toBeVisible()
  }
}
