#!/usr/bin/env node

/**
 * Pre-push check script
 * This script runs before git push to ensure code quality
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

// Config
const config = {
  lintCheck: true,
  typeCheck: true,
  testCheck: true,
  securityCheck: true,
  buildCheck: false, // Skip build check by default as it can be time-consuming
};

// Helper functions
const log = {
  info: (msg) => console.log(`${colors.blue}[INFO]${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}[SUCCESS]${colors.reset} ${msg}`),
  warn: (msg) => console.log(`${colors.yellow}[WARNING]${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}[ERROR]${colors.reset} ${msg}`),
  section: (title) => console.log(`\n${colors.cyan}=== ${title} ===${colors.reset}`),
};

const run = (command, options = {}) => {
  try {
    execSync(command, { stdio: options.silent ? 'pipe' : 'inherit' });
    return true;
  } catch (error) {
    if (!options.silent) {
      log.error(`Command failed: ${command}`);
      console.error(error.message);
    }
    return false;
  }
};

const checkExists = (filePath) => fs.existsSync(path.resolve(process.cwd(), filePath));

// Main check functions
const runLintCheck = () => {
  log.section('Linting Check');
  
  log.info('Checking code style...');
  const lintResult = run('npm run lint', { silent: true });
  
  if (lintResult) {
    log.success('Lint check passed!');
    return true;
  } else {
    log.warn('Lint issues found. Running automatic fixes where possible...');
    run('npm run lint:fix');
    
    log.error('Please fix remaining lint issues before pushing.');
    log.info('You can manually run: npm run lint');
    return false;
  }
};

const runTypeCheck = () => {
  log.section('TypeScript Check');
  
  // Check if the project uses TypeScript
  if (!checkExists('tsconfig.json')) {
    log.info('No TypeScript configuration found, skipping type check.');
    return true;
  }
  
  log.info('Checking types...');
  const typeCheckResult = run('npm run typecheck', { silent: true });
  
  if (typeCheckResult) {
    log.success('Type check passed!');
    return true;
  } else {
    log.error('Type errors found. Please fix them before pushing.');
    log.info('You can manually run: npm run typecheck');
    return false;
  }
};

const runTestCheck = () => {
  log.section('Test Suite');
  
  log.info('Running tests...');
  const testResult = run('npm test -- --bail', { silent: true });
  
  if (testResult) {
    log.success('All tests passed!');
    return true;
  } else {
    log.error('Some tests are failing. Please fix them before pushing.');
    log.info('You can manually run: npm test');
    return false;
  }
};

const runSecurityCheck = () => {
  log.section('Security Check');
  
  log.info('Checking for security vulnerabilities...');
  const auditResult = run('npm audit --production', { silent: true });
  
  if (auditResult) {
    log.success('No security vulnerabilities found!');
    return true;
  } else {
    log.warn('Security vulnerabilities found.');
    log.info('You can manually run: npm audit fix');
    // We don't fail the push for security warnings, just notify
    return true;
  }
};

const runBuildCheck = () => {
  log.section('Build Check');
  
  log.info('Verifying that the project builds correctly...');
  const buildResult = run('npm run build', { silent: true });
  
  if (buildResult) {
    log.success('Build successful!');
    return true;
  } else {
    log.error('Build failed. Please fix the issues before pushing.');
    log.info('You can manually run: npm run build');
    return false;
  }
};

// Main function to run checks
const runChecks = () => {
  log.section('RealStack Pre-Push Checks');
  log.info('Running quality checks before pushing to remote...');
  
  let allPassed = true;
  
  // Run lint check
  if (config.lintCheck) {
    const lintPassed = runLintCheck();
    allPassed = allPassed && lintPassed;
  }
  
  // Run type check
  if (config.typeCheck) {
    const typePassed = runTypeCheck();
    allPassed = allPassed && typePassed;
  }
  
  // Run test check
  if (config.testCheck) {
    const testsPassed = runTestCheck();
    allPassed = allPassed && testsPassed;
  }
  
  // Run security check
  if (config.securityCheck) {
    runSecurityCheck(); // We don't fail for security warnings
  }
  
  // Run build check
  if (config.buildCheck) {
    const buildPassed = runBuildCheck();
    allPassed = allPassed && buildPassed;
  }
  
  // Final report
  if (allPassed) {
    log.section('All Checks Passed');
    log.success('Your code is ready to be pushed!');
    process.exit(0);
  } else {
    log.section('Checks Failed');
    log.error('Please fix the issues before pushing.');
    process.exit(1);
  }
};

// Run the checks
runChecks(); 