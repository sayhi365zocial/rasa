import { Page, expect } from '@playwright/test'

/**
 * Authentication Helper Functions for E2E Tests
 * Provides reusable utilities for login, logout, and auth state checks
 */

/**
 * Login to the application
 * @param page - Playwright page object
 * @param email - User email or identifier
 * @param password - User password
 * @param expectedRole - Optional: Expected role to verify redirect (STAFF, CHECKER, AUDIT, MANAGER, OWNER, ADMIN)
 */
export async function login(
  page: Page,
  email: string,
  password: string,
  expectedRole?: 'STAFF' | 'CHECKER' | 'AUDIT' | 'MANAGER' | 'OWNER' | 'ADMIN'
): Promise<void> {
  try {
    // Navigate to login page
    await page.goto('/login')

    // Wait for the page to load
    await page.waitForLoadState('networkidle')

    // Fill in credentials
    await page.fill('#identifier', email)
    await page.fill('#password', password)

    // Click login button
    await page.click('button[type="submit"]')

    // Wait for navigation after login
    await page.waitForURL(/\/dashboard/, { timeout: 10000 })

    // Verify successful login by checking for dashboard URL
    if (expectedRole) {
      const rolePathMap = {
        STAFF: '/dashboard/staff',
        CHECKER: '/dashboard/staff',  // CHECKER uses same dashboard as STAFF
        AUDIT: '/dashboard/auditor',
        MANAGER: '/dashboard/manager',
        OWNER: '/dashboard/owner',
        ADMIN: '/dashboard/admin',
      }

      const expectedPath = rolePathMap[expectedRole]
      await expect(page).toHaveURL(expectedPath, { timeout: 5000 })
    }

    // Wait for page to be fully loaded
    await page.waitForLoadState('domcontentloaded')
  } catch (error) {
    throw new Error(`Login failed for ${email}: ${error}`)
  }
}

/**
 * Logout from the application
 * @param page - Playwright page object
 */
export async function logout(page: Page): Promise<void> {
  try {
    // Look for logout button - typically in header or menu
    const logoutButton = page.locator('button:has-text("ออกจากระบบ"), a:has-text("ออกจากระบบ")')

    // Check if logout button exists
    const logoutExists = await logoutButton.count() > 0

    if (logoutExists) {
      await logoutButton.first().click()

      // Wait for redirect to login page
      await page.waitForURL('**/login', { timeout: 5000 })
    } else {
      // Alternative: Clear cookies and navigate to login
      await page.context().clearCookies()
      await page.goto('/login')
    }

    // Verify we're on login page
    await expect(page).toHaveURL(/\/login/)
  } catch (error) {
    // If logout fails, force clear cookies
    await page.context().clearCookies()
    await page.goto('/login')
  }
}

/**
 * Get JWT authentication token from cookies
 * @param page - Playwright page object
 * @returns JWT token string or null if not found
 */
export async function getAuthToken(page: Page): Promise<string | null> {
  try {
    const cookies = await page.context().cookies()

    // Look for common JWT cookie names
    const authCookie = cookies.find(
      (cookie) =>
        cookie.name === 'auth-token' ||
        cookie.name === 'token' ||
        cookie.name === 'jwt' ||
        cookie.name === 'session'
    )

    return authCookie ? authCookie.value : null
  } catch (error) {
    console.error('Failed to get auth token:', error)
    return null
  }
}

/**
 * Check if user is currently logged in
 * @param page - Playwright page object
 * @returns true if logged in, false otherwise
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  try {
    // Check if we have auth token
    const token = await getAuthToken(page)
    if (token) return true

    // Alternative: Check if we're on a dashboard page
    const currentUrl = page.url()
    if (currentUrl.includes('/dashboard')) return true

    // Alternative: Try to navigate to dashboard and see if we get redirected
    await page.goto('/dashboard/staff', { waitUntil: 'domcontentloaded' })
    const afterNavUrl = page.url()

    return afterNavUrl.includes('/dashboard')
  } catch (error) {
    return false
  }
}

/**
 * Setup authentication state for a user
 * Useful for skipping login in tests that don't need to test login flow
 * @param page - Playwright page object
 * @param email - User email
 * @param password - User password
 */
export async function setupAuthState(
  page: Page,
  email: string,
  password: string
): Promise<void> {
  await login(page, email, password)

  // Save the authentication state
  await page.context().storageState({ path: `.auth/${email}.json` })
}

/**
 * Wait for API request to complete
 * Useful for waiting for login API call to finish
 * @param page - Playwright page object
 * @param endpoint - API endpoint to wait for (e.g., '/api/auth/login')
 */
export async function waitForApiCall(
  page: Page,
  endpoint: string
): Promise<void> {
  await page.waitForResponse(
    (response) => response.url().includes(endpoint) && response.status() === 200,
    { timeout: 10000 }
  )
}

/**
 * Verify user role by checking dashboard access
 * @param page - Playwright page object
 * @param role - Expected role
 */
export async function verifyUserRole(
  page: Page,
  role: 'STAFF' | 'CHECKER' | 'AUDIT' | 'MANAGER' | 'OWNER' | 'ADMIN'
): Promise<void> {
  const rolePathMap = {
    STAFF: '/dashboard/staff',
    CHECKER: '/dashboard/staff',  // CHECKER uses same dashboard as STAFF
    AUDIT: '/dashboard/auditor',
    MANAGER: '/dashboard/manager',
    OWNER: '/dashboard/owner',
    ADMIN: '/dashboard/admin',
  }

  const expectedPath = rolePathMap[role]
  await page.goto(expectedPath)

  // Verify we're on the correct dashboard
  await expect(page).toHaveURL(expectedPath)
}
