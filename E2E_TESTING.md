# E2E Testing Quick Start Guide

Get started with End-to-End testing for PSARS in 5 minutes.

## Prerequisites

- Dev server running (`npm run dev`)
- Database seeded (`npm run db:seed`)
- Playwright installed (`npx playwright install`)

## Quick Start

### 1. Setup Test Data

```bash
npm run test:e2e:setup
```

This creates test closings, deposits, and user data.

### 2. Run Your First Test

```bash
# Run all tests
npm run test:e2e

# Run with visual UI (recommended for beginners)
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed
```

### 3. View Test Results

Results appear in terminal. For detailed reports:

```bash
# Open HTML report
npx playwright show-report

# View trace (for debugging failures)
npx playwright show-trace trace.zip
```

## Common Commands

| Command | Description |
|---------|-------------|
| `npm run test:e2e` | Run all E2E tests |
| `npm run test:e2e:ui` | Interactive UI mode |
| `npm run test:e2e:headed` | Run with visible browser |
| `npm run test:e2e:debug` | Debug mode with inspector |
| `npm run test:e2e:setup` | Create test data |
| `npm run test:e2e:cleanup` | Remove test data |

## Understanding Test Results

### Passed Test
```
✓ staff can login and view dashboard (2.5s)
```

### Failed Test
```
✗ submit daily closing (3.2s)
  Error: Timeout 30000ms exceeded
  Screenshots: test-results/submit-daily-closing/screenshot.png
```

### Test Summary
```
5 passed (15s)
2 failed
1 skipped
```

## Test Data Available

After running `npm run test:e2e:setup`, you get:

### Daily Closings

| Status | Count | Description |
|--------|-------|-------------|
| DRAFT | 1 | Incomplete closing for testing form submission |
| SUBMITTED | 2 | Waiting for auditor (one has discrepancy) |
| CASH_RECEIVED | 1 | Ready for deposit |
| DEPOSITED | 1 | Complete with deposit record |

### Test Users

| Role | Email | Password |
|------|-------|----------|
| Staff | staff.br001@mermed.com | Staff@2026 |
| Checker | checker@mermaid.clinic | password123 |
| Auditor | auditor@mermed.com | Auditor@2026 |
| Manager | manager@mermed.com | Manager@2026 |
| Owner | owner@mermed.com | Owner@2026 |
| Admin | admin@mermed.com | Admin@2026 |

## Common Workflows Tested

### 1. Staff Workflow

```
Login → View Dashboard → Create Daily Closing → Fill Form → Submit
```

**Test:** `staff-workflow.spec.ts`

### 2. Auditor Workflow

```
Login → View Submitted Closings → Receive Cash → Upload Deposit Slip → Complete Deposit
```

**Test:** `auditor.spec.ts`

### 3. Manager Workflow

```
Login → View Accessible Branches → Filter Closings → View Reports
```

**Test:** `manager.spec.ts`

### 4. Owner Workflow

```
Login → View All Deposits → Approve/Flag Deposits → Confirm Bank Receipt
```

**Test:** `owner.spec.ts`

### 5. Authentication

```
Login → Check Permissions → Logout → Attempt Access (Denied)
```

**Test:** `auth.spec.ts`

## Video & Screenshot Locations

### Screenshots (on failure)

```
test-results/
  test-name-chromium/
    screenshot.png
    trace.zip
```

### Videos (on failure)

```
test-results/
  test-name-chromium/
    video.webm
```

### View captured media

```bash
# Open test results folder
open test-results/

# View specific trace
npx playwright show-trace test-results/test-name-chromium/trace.zip
```

## Debugging Failed Tests

### Method 1: UI Mode (Easiest)

```bash
npm run test:e2e:ui
```

- Click on failed test
- Step through execution
- See screenshots at each step
- Inspect locators

### Method 2: Debug Mode

```bash
npm run test:e2e:debug
```

Opens Playwright Inspector:
- Pause execution
- Step through code
- Evaluate selectors
- See live DOM

### Method 3: Run Single Test

```bash
# Run specific file
npx playwright test auth.spec.ts

# Run specific test by name
npx playwright test --grep "staff can login"

# Run in headed mode to watch
npx playwright test auth.spec.ts --headed
```

### Method 4: Check Screenshots

Failed tests automatically capture:
- Screenshot of failure point
- Video of entire test (if configured)
- Trace file for time-travel debugging

Location: `test-results/[test-name]/`

## Troubleshooting

### "Server is not running"

**Solution:**
```bash
# Start dev server
npm run dev
```

### "No test data found"

**Solution:**
```bash
# Setup test data
npm run test:e2e:setup
```

### "Element not found"

**Solution:**
```bash
# Use inspector to find correct selector
npm run test:e2e:debug
```

### Tests running too slow

**Solution:**
```bash
# Run with more workers (parallel execution)
npx playwright test --workers=4
```

### Need fresh start

**Solution:**
```bash
# Cleanup and reset
npm run test:e2e:cleanup
npm run test:e2e:setup

# Or full database reset
npm run db:push -- --force-reset
npm run db:seed
npm run test:e2e:setup
```

## Writing Your First Test

Create `e2e/tests/my-test.spec.ts`:

```typescript
import { test, expect } from '@playwright/test'

test.describe('My Feature', () => {
  test('should work correctly', async ({ page }) => {
    // Navigate to page
    await page.goto('http://localhost:3000')

    // Interact with page
    await page.getByRole('button', { name: 'Click Me' }).click()

    // Assert result
    await expect(page.getByText('Success!')).toBeVisible()
  })
})
```

Run it:
```bash
npx playwright test my-test.spec.ts
```

## Best Practices

1. **Use semantic selectors**
   ```typescript
   // Good
   page.getByRole('button', { name: 'Submit' })
   page.getByLabel('Email')

   // Bad
   page.click('.btn-submit')
   ```

2. **Wait for elements**
   ```typescript
   await page.waitForSelector('.loading', { state: 'hidden' })
   await expect(page.getByText('Loaded')).toBeVisible()
   ```

3. **Clean up after tests**
   ```typescript
   test.afterEach(async () => {
     // Cleanup test data
   })
   ```

4. **Use test data helpers**
   ```typescript
   import { createTestClosing } from '../fixtures/test-helpers'

   const closing = await createTestClosing()
   ```

## Next Steps

1. Read full documentation: [e2e/README.md](./e2e/README.md)
2. Review existing tests in `e2e/tests/`
3. Watch Playwright tutorial: https://playwright.dev/docs/intro
4. Try writing your own test

## Useful Resources

- [Playwright Docs](https://playwright.dev/)
- [E2E Testing Best Practices](https://playwright.dev/docs/best-practices)
- [Selector Strategies](https://playwright.dev/docs/locators)
- [Full E2E Documentation](./e2e/README.md)

## Getting Help

1. Check this guide
2. Read [e2e/README.md](./e2e/README.md) for details
3. Review existing test examples
4. Check Playwright documentation
5. Ask the development team

---

**Quick Reference Card**

```bash
# Setup
npm run test:e2e:setup

# Run tests
npm run test:e2e              # All tests
npm run test:e2e:ui           # UI mode
npm run test:e2e:headed       # See browser
npm run test:e2e:debug        # Debug mode

# Cleanup
npm run test:e2e:cleanup

# Reports
npx playwright show-report    # HTML report
npx playwright show-trace trace.zip  # Trace viewer
```

---

Happy testing!
