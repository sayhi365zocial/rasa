import { test as base, Page, Browser, BrowserContext } from '@playwright/test';
import { login } from './helpers/auth';
import { TEST_ACCOUNTS } from './fixtures/test-accounts';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ClosingPage } from './pages/ClosingPage';

/**
 * Extended test fixtures for RASA E2E tests
 * Provides authenticated pages for each role and common utilities
 */

export type TestAccountRole = keyof typeof TEST_ACCOUNTS;

interface RASAFixtures {
  staffPage: Page;
  checkerPage: Page;
  auditPage: Page;
  managerPage: Page;
  ownerPage: Page;
  adminPage: Page;
  loginPage: LoginPage;
  dashboardPage: DashboardPage;
  closingPage: ClosingPage;
  authenticatedPage: Page;
}

/**
 * Create authenticated page for a specific role
 *
 * @param browser - Playwright browser instance
 * @param role - User role to authenticate as
 * @returns Authenticated page
 */
async function createAuthenticatedPage(
  browser: Browser,
  role: TestAccountRole
): Promise<Page> {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: process.env.CI ? { dir: 'test-results/videos' } : undefined,
  });

  const page = await context.newPage();

  // Login with role credentials
  const account = TEST_ACCOUNTS[role];
  await login(page, account.email, account.password);

  return page;
}

/**
 * Extended test fixture with authenticated pages for all roles
 */
export const test = base.extend<RASAFixtures>({
  /**
   * Staff role authenticated page
   */
  staffPage: async ({ browser }, use) => {
    const page = await createAuthenticatedPage(browser, 'staff');
    await use(page);
    await page.close();
  },

  /**
   * Checker role authenticated page
   */
  checkerPage: async ({ browser }, use) => {
    const page = await createAuthenticatedPage(browser, 'checker');
    await use(page);
    await page.close();
  },

  /**
   * Audit role authenticated page
   */
  auditPage: async ({ browser }, use) => {
    const page = await createAuthenticatedPage(browser, 'audit');
    await use(page);
    await page.close();
  },

  /**
   * Manager role authenticated page
   */
  managerPage: async ({ browser }, use) => {
    const page = await createAuthenticatedPage(browser, 'manager');
    await use(page);
    await page.close();
  },

  /**
   * Owner role authenticated page
   */
  ownerPage: async ({ browser }, use) => {
    const page = await createAuthenticatedPage(browser, 'owner');
    await use(page);
    await page.close();
  },

  /**
   * Admin role authenticated page
   */
  adminPage: async ({ browser }, use) => {
    const page = await createAuthenticatedPage(browser, 'admin');
    await use(page);
    await page.close();
  },

  /**
   * Login page object
   */
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page);
    await use(loginPage);
  },

  /**
   * Dashboard page object
   */
  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page);
    await use(dashboardPage);
  },

  /**
   * Closing page object
   */
  closingPage: async ({ page }, use) => {
    const closingPage = new ClosingPage(page);
    await use(closingPage);
  },

  /**
   * Generic authenticated page (defaults to staff role)
   * Can be used when role doesn't matter
   */
  authenticatedPage: async ({ browser }, use) => {
    const page = await createAuthenticatedPage(browser, 'staff');
    await use(page);
    await page.close();
  },
});

/**
 * Re-export expect from Playwright
 */
export { expect } from '@playwright/test';

/**
 * Helper function to setup a test with authentication
 * Use this in tests that need a specific role
 *
 * @example
 * test('manager can create closing', async ({ browser }) => {
 *   const { page, account } = await setupAuthenticatedTest(browser, 'manager');
 *   // Your test code here
 * });
 */
export async function setupAuthenticatedTest(
  browser: Browser,
  role: TestAccountRole
): Promise<{ page: Page; account: typeof TEST_ACCOUNTS[TestAccountRole]; context: BrowserContext }> {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();
  const account = TEST_ACCOUNTS[role];

  await login(page, account.email, account.password);

  return { page, account, context };
}

/**
 * Helper function to clean up after a test
 *
 * @param page - Page to clean up
 */
export async function cleanupTest(page: Page): Promise<void> {
  await page.context().clearCookies();
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.close();
}

/**
 * Helper to wait for page navigation
 *
 * @param page - Page to wait for
 * @param urlPattern - URL pattern to wait for
 */
export async function waitForNavigation(page: Page, urlPattern: RegExp): Promise<void> {
  await page.waitForURL(urlPattern, {
    timeout: 10000,
    waitUntil: 'networkidle'
  });
}
