/**
 * MULTIODOO E2E Test Report Generator
 * Generates a comprehensive success/failure report from Playwright test results
 */

import * as fs from 'fs';
import * as path from 'path';

interface TestCase {
  title: string;
  fullTitle: string;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut';
  duration: number;
  error?: {
    message: string;
    stack?: string;
  };
  retry?: number;
}

interface TestSuite {
  title: string;
  file: string;
  tests: TestCase[];
  suites?: TestSuite[];
}

interface TestResults {
  config: {
    projects: Array<{ name: string }>;
  };
  suites: TestSuite[];
  stats?: {
    startTime: string;
    duration: number;
  };
}

function flattenTests(suites: TestSuite[], prefix = ''): TestCase[] {
  const tests: TestCase[] = [];

  for (const suite of suites) {
    const suitePath = prefix ? `${prefix} > ${suite.title}` : suite.title;

    for (const test of suite.tests || []) {
      tests.push({
        ...test,
        fullTitle: `${suitePath} > ${test.title}`,
      });
    }

    if (suite.suites) {
      tests.push(...flattenTests(suite.suites, suitePath));
    }
  }

  return tests;
}

function generateReport(resultsPath: string): string {
  const resultsFile = path.resolve(resultsPath);

  if (!fs.existsSync(resultsFile)) {
    return generateNoResultsReport();
  }

  const results: TestResults = JSON.parse(fs.readFileSync(resultsFile, 'utf-8'));
  const allTests = flattenTests(results.suites);

  const passed = allTests.filter(t => t.status === 'passed');
  const failed = allTests.filter(t => t.status === 'failed');
  const skipped = allTests.filter(t => t.status === 'skipped');
  const timedOut = allTests.filter(t => t.status === 'timedOut');

  const totalDuration = allTests.reduce((sum, t) => sum + t.duration, 0);
  const passRate = allTests.length > 0
    ? ((passed.length / allTests.length) * 100).toFixed(1)
    : '0';

  const now = new Date().toISOString();

  let report = `
╔════════════════════════════════════════════════════════════════════════════════╗
║                    MULTIODOO E2E TEST REPORT                                   ║
║                    Quality Control Testing Results                              ║
╚════════════════════════════════════════════════════════════════════════════════╝

Generated: ${now}
Total Duration: ${(totalDuration / 1000).toFixed(2)}s

═══════════════════════════════════════════════════════════════════════════════════
                               SUMMARY
═══════════════════════════════════════════════════════════════════════════════════

  Total Tests:    ${allTests.length}
  ✅ Passed:      ${passed.length}
  ❌ Failed:      ${failed.length}
  ⏭️  Skipped:     ${skipped.length}
  ⏱️  Timed Out:   ${timedOut.length}

  Pass Rate:      ${passRate}%

`;

  // Group tests by module
  const moduleMap = new Map<string, TestCase[]>();

  for (const test of allTests) {
    const parts = test.fullTitle.split(' > ');
    const module = parts[0] || 'Unknown';

    if (!moduleMap.has(module)) {
      moduleMap.set(module, []);
    }
    moduleMap.get(module)!.push(test);
  }

  report += `
═══════════════════════════════════════════════════════════════════════════════════
                           RESULTS BY MODULE
═══════════════════════════════════════════════════════════════════════════════════
`;

  for (const [module, tests] of moduleMap) {
    const modulePassed = tests.filter(t => t.status === 'passed').length;
    const moduleFailed = tests.filter(t => t.status === 'failed').length;
    const moduleSkipped = tests.filter(t => t.status === 'skipped').length;
    const modulePassRate = tests.length > 0
      ? ((modulePassed / tests.length) * 100).toFixed(0)
      : '0';

    const statusIcon = moduleFailed > 0 ? '❌' : moduleSkipped === tests.length ? '⏭️' : '✅';

    report += `
┌─────────────────────────────────────────────────────────────────────────────────
│ ${statusIcon} ${module}
│ Pass Rate: ${modulePassRate}% | Passed: ${modulePassed} | Failed: ${moduleFailed} | Skipped: ${moduleSkipped}
└─────────────────────────────────────────────────────────────────────────────────
`;

    for (const test of tests) {
      const icon = test.status === 'passed' ? '✓'
        : test.status === 'failed' ? '✗'
        : test.status === 'skipped' ? '○'
        : '⏱';
      const duration = `(${test.duration}ms)`;
      const testTitle = test.fullTitle.replace(`${module} > `, '');

      report += `    ${icon} ${testTitle} ${duration}\n`;
    }
  }

  if (failed.length > 0) {
    report += `
═══════════════════════════════════════════════════════════════════════════════════
                              FAILURES DETAIL
═══════════════════════════════════════════════════════════════════════════════════
`;

    for (let i = 0; i < failed.length; i++) {
      const test = failed[i];
      report += `
${i + 1}. ${test.fullTitle}
   Status: FAILED
   Duration: ${test.duration}ms
   Error: ${test.error?.message || 'Unknown error'}
`;
      if (test.error?.stack) {
        const stackLines = test.error.stack.split('\n').slice(0, 5).join('\n   ');
        report += `   Stack:\n   ${stackLines}\n`;
      }
    }
  }

  report += `
═══════════════════════════════════════════════════════════════════════════════════
                           TEST COVERAGE BY FEATURE
═══════════════════════════════════════════════════════════════════════════════════

  ┌──────────────────────────────┬─────────┬────────────┐
  │ Feature                      │ Tests   │ Status     │
  ├──────────────────────────────┼─────────┼────────────┤
`;

  const features = [
    { name: 'Authentication', pattern: 'auth' },
    { name: 'Navigation', pattern: 'navigation' },
    { name: 'Products', pattern: 'products' },
    { name: 'Stock Operations', pattern: 'stock' },
    { name: 'Dashboard', pattern: 'dashboard' },
    { name: 'User Management', pattern: 'user' },
    { name: 'Workflows', pattern: 'workflow' },
    { name: 'Settings', pattern: 'settings' },
  ];

  for (const feature of features) {
    const featureTests = allTests.filter(t =>
      t.fullTitle.toLowerCase().includes(feature.pattern)
    );
    const featurePassed = featureTests.filter(t => t.status === 'passed').length;
    const status = featureTests.length === 0
      ? 'No Tests'
      : featurePassed === featureTests.length
        ? '✅ PASS'
        : `❌ ${featurePassed}/${featureTests.length}`;

    const paddedName = feature.name.padEnd(28);
    const paddedCount = String(featureTests.length).padStart(5);
    const paddedStatus = status.padStart(10);

    report += `  │ ${paddedName} │${paddedCount}   │${paddedStatus}  │\n`;
  }

  report += `  └──────────────────────────────┴─────────┴────────────┘

═══════════════════════════════════════════════════════════════════════════════════
                              RECOMMENDATIONS
═══════════════════════════════════════════════════════════════════════════════════
`;

  if (failed.length === 0 && skipped.length === 0) {
    report += `
  ✅ All tests passed! The application is functioning as expected.

  Next Steps:
  - Consider adding more edge case tests
  - Review test coverage for new features
  - Monitor performance metrics
`;
  } else if (failed.length > 0) {
    report += `
  ⚠️  ${failed.length} test(s) failed. Please review the failures above.

  Recommended Actions:
  1. Fix the failing tests or underlying bugs
  2. Review error messages and stack traces
  3. Check if the application is running correctly
  4. Verify test environment configuration
`;
  } else if (skipped.length > 0) {
    report += `
  ⏭️  ${skipped.length} test(s) were skipped.

  Note: Tests are typically skipped due to:
  - License not activated
  - User not authenticated
  - Feature not available

  Recommended Actions:
  1. Verify test credentials are correct
  2. Ensure the application is properly configured
  3. Activate necessary licenses
`;
  }

  report += `
═══════════════════════════════════════════════════════════════════════════════════
                              END OF REPORT
═══════════════════════════════════════════════════════════════════════════════════
`;

  return report;
}

function generateNoResultsReport(): string {
  return `
╔════════════════════════════════════════════════════════════════════════════════╗
║                    MULTIODOO E2E TEST REPORT                                   ║
║                    Quality Control Testing Results                              ║
╚════════════════════════════════════════════════════════════════════════════════╝

⚠️  No test results found.

This could mean:
1. Tests haven't been run yet
2. The test results file doesn't exist
3. The path to results is incorrect

To run tests, execute:
  npx playwright test

To generate this report after running tests:
  npx ts-node scripts/generate-test-report.ts
`;
}

// Main execution
const resultsPath = process.argv[2] || './e2e-report/test-results.json';
const report = generateReport(resultsPath);

// Output to console
console.log(report);

// Save to file
const outputPath = './e2e-report/TEST-REPORT.txt';
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}
fs.writeFileSync(outputPath, report);
console.log(`\nReport saved to: ${outputPath}`);
