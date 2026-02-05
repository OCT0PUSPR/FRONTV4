import { FullConfig } from '@playwright/test';

/**
 * Global setup for MULTIODOO E2E tests
 * Runs once before all tests
 */

async function globalSetup(config: FullConfig) {
  console.log('\n');
  console.log('='.repeat(60));
  console.log('  MULTIODOO Warehouse Management System');
  console.log('  End-to-End Quality Control Testing Suite');
  console.log('='.repeat(60));
  console.log('\n');
  console.log(`Base URL: ${config.projects[0].use.baseURL}`);
  console.log(`Projects: ${config.projects.map(p => p.name).join(', ')}`);
  console.log('\n');
  console.log('Starting test execution...');
  console.log('-'.repeat(60));
}

export default globalSetup;
