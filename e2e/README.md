# E2E Testing with Playwright

This directory contains end-to-end tests for the RASA application using Playwright.

## Structure

```
e2e/
├── fixtures/           # Test data and account credentials
│   └── test-accounts.ts
├── helpers/            # Reusable test utilities
│   └── auth.ts
├── pages/              # Page Object Models
│   ├── LoginPage.ts
│   ├── DashboardPage.ts
│   └── ClosingPage.ts
├── setup/              # Global setup and teardown
│   ├── global-setup.ts
│   └── global-teardown.ts
├── example.spec.ts     # Example test suite
└── README.md
```

## Prerequisites

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install
```

3. Ensure database is seeded with test data:
```bash
npm run db:seed
```

4. Start the development server:
```bash
npm run dev
```

## Running Tests

### Run all tests
```bash
npm run test:e2e
```

### Run tests in UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser)
```bash
npm run test:e2e:headed
```

### Run tests in debug mode
```bash
npm run test:e2e:debug
```

### Run specific test file
```bash
npx playwright test e2e/example.spec.ts
```

### Run tests matching a pattern
```bash
npx playwright test --grep "login"
```

## Writing Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test'
import { LoginPage } from './pages/LoginPage'
import { TEST_ACCOUNTS } from './fixtures/test-accounts'

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    const loginPage = new LoginPage(page)
    
    await loginPage.goto()
    await loginPage.login(
      TEST_ACCOUNTS.staff.email,
      TEST_ACCOUNTS.staff.password
    )
    
    await expect(page).toHaveURL('/dashboard/staff')
  })
})
```

### Using Authentication Helper

```typescript
import { login, logout, isLoggedIn } from './helpers/auth'

test('my test', async ({ page }) => {
  // Quick login
  await login(page, TEST_ACCOUNTS.staff.email, TEST_ACCOUNTS.staff.password, 'STAFF')
  
  // Check if logged in
  const loggedIn = await isLoggedIn(page)
  expect(loggedIn).toBe(true)
  
  // Logout
  await logout(page)
})
```

### Using Page Object Models

Page Object Models encapsulate page interactions:

```typescript
import { ClosingPage } from './pages/ClosingPage'

test('create closing', async ({ page }) => {
  const closingPage = new ClosingPage(page)
  
  await closingPage.goto()
  await closingPage.setClosingDate('2026-03-10')
  await closingPage.skipUpload()
  await closingPage.fillClosingData({
    totalSales: 50000,
    cash: 20000,
    credit: 15000,
    transfer: 10000,
    expenses: 5000,
  })
  await closingPage.proceedToConfirmation()
  await closingPage.submit()
})
```

## Test Accounts

Test accounts are defined in `fixtures/test-accounts.ts`:

| Role    | Email                      | Password     |
|---------|----------------------------|--------------|
| Staff   | staff.br001@mermed.com     | Staff@2026   |
| Audit   | auditor@mermed.com         | Auditor@2026 |
| Manager | manager@mermed.com         | Manager@2026 |
| Owner   | owner@mermed.com           | Owner@2026   |
| Admin   | admin@mermed.com           | Admin@2026   |

## Configuration

Configuration is in `playwright.config.ts`:

- **Base URL**: `http://localhost:3000`
- **Test Directory**: `e2e/`
- **Timeout**: 30 seconds per test
- **Workers**: 1 (sequential execution to avoid database race conditions)
- **Retries**: 1 time on failure
- **Screenshots**: On failure
- **Videos**: On retry

## Reports

After running tests, reports are generated in:

- **HTML Report**: `playwright-report/index.html`
- **JSON Results**: `playwright-report/test-results.json`
- **Test Results**: `test-results/`
- **Screenshots**: `screenshots/`

View HTML report:
```bash
npx playwright show-report
```

## Best Practices

1. **Use Page Object Models**: Encapsulate page interactions in POM classes
2. **Use Test Fixtures**: Store test data in fixtures for reusability
3. **Authentication**: Use helper functions for login/logout
4. **Unique Test Data**: Use timestamps or UUIDs for test data to avoid conflicts
5. **Clean Up**: Mark tests that create data with `.skip` or clean up after
6. **Meaningful Names**: Use descriptive test names
7. **Single Responsibility**: Each test should verify one thing
8. **Independent Tests**: Tests should not depend on each other

## Debugging

### Debug specific test
```bash
npx playwright test --debug e2e/example.spec.ts
```

### Take screenshots during test
```typescript
await page.screenshot({ path: 'debug.png' })
```

### Pause execution
```typescript
await page.pause()
```

### Console logs
```typescript
page.on('console', msg => console.log(msg.text()))
```

## Troubleshooting

### Server not running
```
Error: Development server is not running
Solution: Run `npm run dev` in another terminal
```

### Test data missing
```
Warning: Test account login failed
Solution: Run `npm run db:seed` to seed test data
```

### Port already in use
```
Solution: Stop other services on port 3000 or change BASE_URL in config
```

### Tests timing out
```
Solution: Increase timeout in playwright.config.ts or use page.waitForTimeout()
```

## CI/CD Integration

Tests can run in CI by setting the `CI` environment variable:

```yaml
# Example GitHub Actions
- name: Run E2E tests
  run: npm run test:e2e
  env:
    CI: true
```

In CI mode:
- Browsers run in headless mode
- Retries are set to 2
- Server waits longer for startup

## Additional Resources

- [Playwright Documentation](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging](https://playwright.dev/docs/debug)
- [Selectors](https://playwright.dev/docs/selectors)
