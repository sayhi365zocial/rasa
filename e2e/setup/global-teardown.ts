import * as fs from 'fs'
import * as path from 'path'

/**
 * Global Teardown for Playwright E2E Tests
 * Runs once after all tests complete
 *
 * Responsibilities:
 * - Clean up temporary files
 * - Generate test summary
 * - Clean up authentication states
 */
async function globalTeardown() {
  console.log('\n🏁 E2E Test Suite Completed\n')

  // 1. Display test summary information
  console.log('📊 Test Results:')
  console.log('   - HTML Report: ./playwright-report/index.html')
  console.log('   - JSON Results: ./playwright-report/test-results.json')
  console.log('   - Test Results: ./test-results/')
  console.log('   - Screenshots: ./screenshots/')

  // 2. Clean up authentication state files (optional)
  try {
    const authDir = path.resolve(process.cwd(), '.auth')
    if (fs.existsSync(authDir)) {
      const files = fs.readdirSync(authDir)
      console.log(`\n🧹 Cleaning up ${files.length} authentication state files...`)

      for (const file of files) {
        const filePath = path.join(authDir, file)
        fs.unlinkSync(filePath)
      }

      console.log('✅ Authentication states cleaned')
    }
  } catch (error) {
    console.error('⚠️  Failed to clean up authentication states:', error)
  }

  // 3. Check for failed tests and provide helpful information
  try {
    const resultsFile = path.resolve(process.cwd(), 'playwright-report/test-results.json')
    if (fs.existsSync(resultsFile)) {
      const results = JSON.parse(fs.readFileSync(resultsFile, 'utf-8'))

      if (results.stats) {
        console.log('\n📈 Test Statistics:')
        console.log(`   - Total: ${results.stats.total || 0}`)
        console.log(`   - Passed: ${results.stats.passed || 0}`)
        console.log(`   - Failed: ${results.stats.failed || 0}`)
        console.log(`   - Skipped: ${results.stats.skipped || 0}`)

        if (results.stats.failed > 0) {
          console.log('\n⚠️  Some tests failed. Check the HTML report for details:')
          console.log('   npx playwright show-report')
        }
      }
    }
  } catch (error) {
    // Results file might not exist or be malformed, that's okay
  }

  // 4. Provide helpful commands
  console.log('\n💡 Helpful Commands:')
  console.log('   - View HTML report: npx playwright show-report')
  console.log('   - Run tests in UI mode: npm run test:e2e:ui')
  console.log('   - Debug tests: npm run test:e2e:debug')
  console.log('   - Run specific test: npx playwright test <test-file>')

  console.log('\n✨ Thank you for running the test suite!\n')
}

export default globalTeardown
