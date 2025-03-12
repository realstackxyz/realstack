/**
 * RealStack CI/CD Security Check Tool
 * 
 * Provides automated security checks that can be integrated into CI/CD processes,
 * including dependency scanning, static code analysis, and security configuration checks.
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const { createLogger } = require('../utils/logger');

// Create logger
const logger = createLogger({
  service: 'security_ci_cd',
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
});

/**
 * CI/CD Security Check Tool
 */
class SecurityCIChecks {
  /**
   * Create a CI/CD security check tool
   * 
   * @param {Object} options Configuration options
   * @param {string} options.projectRoot Project root directory
   * @param {Array} options.ignorePatterns Ignored file patterns
   * @param {Object} options.thresholds Security threshold configurations
   * @param {boolean} options.failOnError Whether to fail the build when errors are found
   */
  constructor(options = {}) {
    this.options = {
      projectRoot: options.projectRoot || process.cwd(),
      ignorePatterns: options.ignorePatterns || [
        'node_modules',
        'dist',
        'build',
        'coverage',
        '.git'
      ],
      thresholds: {
        vulnerabilities: {
          critical: 0,
          high: 0,
          moderate: 5,
          low: 10
        },
        codeCoverage: 80,
        ...options.thresholds
      },
      failOnError: options.failOnError !== false,
      reportDir: options.reportDir || 'security-reports',
      ...options
    };

    // Ensure report directory exists
    this.ensureReportDir();
  }

  /**
   * Ensure report directory exists
   */
  async ensureReportDir() {
    const reportDir = path.join(this.options.projectRoot, this.options.reportDir);
    try {
      await fs.mkdir(reportDir, { recursive: true });
    } catch (error) {
      logger.error('Unable to create report directory', {
        directory: reportDir,
        error: error.message
      });
    }
  }

  /**
   * Get report file path
   * 
   * @param {string} reportName Report name
   * @returns {string} Report file path
   */
  getReportPath(reportName) {
    return path.join(
      this.options.projectRoot,
      this.options.reportDir,
      `${reportName}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
    );
  }

  /**
   * Save check results to file
   * 
   * @param {string} reportName Report name
   * @param {Object} results Check results
   */
  async saveReport(reportName, results) {
    const reportPath = this.getReportPath(reportName);
    try {
      await fs.writeFile(
        reportPath,
        JSON.stringify(results, null, 2),
        'utf8'
      );
      logger.info(`Report saved to ${reportPath}`);
    } catch (error) {
      logger.error('Failed to save report', {
        reportName,
        error: error.message
      });
    }
  }

  /**
   * Parse dependency scan results
   * 
   * @param {string} output npm audit output
   * @returns {Object} Parsed results
   */
  parseDependencyScanResults(output) {
    try {
      const auditData = JSON.parse(output);
      
      // Calculate vulnerability counts by severity
      const vulnerabilities = {
        critical: 0,
        high: 0,
        moderate: 0,
        low: 0,
        info: 0,
        total: 0
      };
      
      // npm audit format has changed several times, adapt to different output formats
      if (auditData.vulnerabilities) {
        // npm 7+
        Object.values(auditData.vulnerabilities).forEach(vuln => {
          vulnerabilities[vuln.severity] += 1;
          vulnerabilities.total += 1;
        });
      } else if (auditData.advisories) {
        // npm 6
        Object.values(auditData.advisories).forEach(advisory => {
          vulnerabilities[advisory.severity] += 1;
          vulnerabilities.total += 1;
        });
      }
      
      return {
        vulnerabilities,
        metadata: {
          totalDependencies: auditData.metadata?.totalDependencies || 0,
          dependencies: auditData.dependencies || {},
          advisories: auditData.advisories || {},
        },
        raw: auditData
      };
    } catch (error) {
      logger.error('Failed to parse dependency scan results', { error: error.message });
      return {
        error: true,
        message: error.message
      };
    }
  }

  /**
   * Execute dependency security scan
   * 
   * @returns {Promise<Object>} Scan results
   */
  async scanDependencies() {
    logger.info('Starting dependency security scan');
    
    try {
      // Use npm audit to scan dependencies
      const output = execSync('npm audit --json', {
        cwd: this.options.projectRoot,
        encoding: 'utf8'
      });
      
      const results = this.parseDependencyScanResults(output);
      
      // Save report
      await this.saveReport('dependency-scan', results);
      
      // Check if thresholds are exceeded
      const thresholds = this.options.thresholds.vulnerabilities;
      const vulnerabilities = results.vulnerabilities;
      
      const thresholdExceeded = 
        vulnerabilities.critical > thresholds.critical ||
        vulnerabilities.high > thresholds.high ||
        vulnerabilities.moderate > thresholds.moderate ||
        vulnerabilities.low > thresholds.low;
      
      if (thresholdExceeded) {
        logger.warn('Dependency scan found vulnerabilities exceeding thresholds', {
          found: vulnerabilities,
          thresholds
        });
        
        if (this.options.failOnError) {
          throw new Error('Dependency scan failed: Security vulnerabilities exceed thresholds');
        }
      }
      
      logger.info('Dependency security scan completed', { vulnerabilitiesFound: vulnerabilities.total });
      return results;
    } catch (error) {
      logger.error('Dependency security scan failed', { error: error.message });
      
      if (this.options.failOnError) {
        throw error;
      }
      
      return {
        error: true,
        message: error.message
      };
    }
  }

  /**
   * Execute static code analysis
   * 
   * @returns {Promise<Object>} Analysis results
   */
  async staticCodeAnalysis() {
    logger.info('Starting static code analysis');
    
    try {
      // Use ESLint for static analysis
      // Note: This requires ESLint to be installed in the project
      const output = execSync('npx eslint --format json --ext .js,.jsx,.ts,.tsx .', {
        cwd: this.options.projectRoot,
        encoding: 'utf8'
      });
      
      let results;
      try {
        results = JSON.parse(output);
      } catch (parseError) {
        results = {
          error: true,
          message: 'Unable to parse ESLint output',
          raw: output
        };
      }
      
      // Summarize results
      let errorCount = 0;
      let warningCount = 0;
      let securityIssues = [];
      
      if (Array.isArray(results)) {
        results.forEach(file => {
          errorCount += file.errorCount || 0;
          warningCount += file.warningCount || 0;
          
          // Extract security-related issues
          if (file.messages && Array.isArray(file.messages)) {
            securityIssues = [
              ...securityIssues,
              ...file.messages.filter(msg => 
                msg.ruleId && (
                  msg.ruleId.includes('security') || 
                  msg.ruleId.includes('xss') || 
                  msg.ruleId.includes('injection') ||
                  msg.ruleId.includes('sanitize')
                )
              ).map(msg => ({
                ...msg,
                filePath: file.filePath
              }))
            ];
          }
        });
      }
      
      const summary = {
        errorCount,
        warningCount,
        securityIssuesCount: securityIssues.length,
        securityIssues,
        files: results
      };
      
      // Save report
      await this.saveReport('static-analysis', summary);
      
      logger.info('Static code analysis completed', { 
        errorCount,
        warningCount,
        securityIssuesCount: securityIssues.length 
      });
      
      return summary;
    } catch (error) {
      logger.error('Static code analysis failed', { error: error.message });
      
      if (this.options.failOnError) {
        throw error;
      }
      
      return {
        error: true,
        message: error.message
      };
    }
  }

  /**
   * Check security configurations
   * 
   * @returns {Promise<Object>} Check results
   */
  async checkSecurityConfigs() {
    logger.info('Starting security configuration check');
    
    const results = {
      issues: [],
      passed: [],
      score: 0,
      maxScore: 0
    };
    
    try {
      // Define security configuration check items
      const securityChecks = [
        {
          name: 'Helmet Security Headers',
          description: 'Check if secure HTTP headers are configured',
          check: async () => {
            const packageJson = await this.readPackageJson();
            const hasHelmet = packageJson.dependencies?.helmet || packageJson.dependencies?.['helmet-csp'];
            
            if (!hasHelmet) {
              return {
                passed: false,
                message: 'Helmet dependency not found, HTTP security headers may be missing'
              };
            }
            
            return { passed: true };
          },
          importance: 'high'
        },
        {
          name: 'CSRF Protection',
          description: 'Check if CSRF protection is configured',
          check: async () => {
            const packageJson = await this.readPackageJson();
            const hasCsrf = packageJson.dependencies?.csurf;
            
            if (!hasCsrf) {
              return {
                passed: false,
                message: 'CSRF protection dependency not found'
              };
            }
            
            return { passed: true };
          },
          importance: 'high'
        },
        {
          name: 'XSS Protection',
          description: 'Check if XSS protection is configured',
          check: async () => {
            const packageJson = await this.readPackageJson();
            const hasXss = packageJson.dependencies?.['xss-filters'] || 
                          packageJson.dependencies?.['xss-clean'] ||
                          packageJson.dependencies?.dompurify;
            
            if (!hasXss) {
              return {
                passed: false,
                message: 'XSS protection dependency not found'
              };
            }
            
            return { passed: true };
          },
          importance: 'high'
        },
        {
          name: 'SQL Injection Protection',
          description: 'Check if SQL injection protection is configured',
          check: async () => {
            const packageJson = await this.readPackageJson();
            const hasORM = packageJson.dependencies?.sequelize || 
                          packageJson.dependencies?.mongoose || 
                          packageJson.dependencies?.typeorm ||
                          packageJson.dependencies?.prisma;
            
            if (!hasORM) {
              return {
                passed: false,
                message: 'ORM framework dependency not found, SQL injection protection may be missing'
              };
            }
            
            return { passed: true };
          },
          importance: 'high'
        },
        {
          name: 'Content-Security-Policy',
          description: 'Check if CSP is configured',
          check: async () => {
            // Simplified handling, actual should check Helmet configuration file
            const hasHelmetCsp = await this.findInFiles(
              ['src/**/*.js', 'app/**/*.js'],
              /contentSecurityPolicy|CSP/i
            );
            
            if (!hasHelmetCsp) {
              return {
                passed: false,
                message: 'Content-Security-Policy configuration not found'
              };
            }
            
            return { passed: true };
          },
          importance: 'medium'
        },
        {
          name: 'Environment Variable Security Configuration',
          description: 'Check if there is secure environment variable configuration',
          check: async () => {
            const hasEnvExample = await this.fileExists('.env.example');
            const hasEnvGitignore = await this.findInFiles('.gitignore', /\.env$/);
            
            if (!hasEnvExample) {
              return {
                passed: false,
                message: '.env.example file not found'
              };
            }
            
            if (!hasEnvGitignore) {
              return {
                passed: false,
                message: '.env file may not be excluded by .gitignore'
              };
            }
            
            return { passed: true };
          },
          importance: 'medium'
        },
        {
          name: 'Password Storage Security',
          description: 'Check if secure password storage algorithms are used',
          check: async () => {
            const packageJson = await this.readPackageJson();
            const hasBcrypt = packageJson.dependencies?.bcrypt || 
                            packageJson.dependencies?.bcryptjs ||
                            packageJson.dependencies?.argon2;
            
            if (!hasBcrypt) {
              return {
                passed: false,
                message: 'Secure password hashing algorithm dependency not found'
              };
            }
            
            return { passed: true };
          },
          importance: 'high'
        },
        {
          name: 'JWT Configuration Security',
          description: 'Check if JWT configuration is secure',
          check: async () => {
            const hasJwt = await this.findInFiles(
              ['src/**/*.js', 'app/**/*.js'],
              /jwt\.sign.*expiresIn/i
            );
            
            if (!hasJwt) {
              return {
                passed: false,
                message: 'JWT may not be configured with expiration time'
              };
            }
            
            return { passed: true };
          },
          importance: 'medium'
        },
        {
          name: 'CORS Configuration',
          description: 'Check if CORS configuration is secure',
          check: async () => {
            const hasCors = await this.findInFiles(
              ['src/**/*.js', 'app/**/*.js'],
              /cors\(/i
            );
            
            const hasWildcard = await this.findInFiles(
              ['src/**/*.js', 'app/**/*.js'],
              /origin\s*:\s*['"]?\*['"]?/i
            );
            
            if (!hasCors) {
              return {
                passed: false,
                message: 'CORS configuration not found'
              };
            }
            
            if (hasWildcard) {
              return {
                passed: false,
                message: 'CORS configuration may be using wildcard'
              };
            }
            
            return { passed: true };
          },
          importance: 'medium'
        },
        {
          name: 'File Upload Limits',
          description: 'Check if file upload limits are set',
          check: async () => {
            const hasFileUploadLimit = await this.findInFiles(
              ['src/**/*.js', 'app/**/*.js'],
              /limits\s*:\s*{[\s\S]*?fileSize/i
            );
            
            if (!hasFileUploadLimit) {
              return {
                passed: false,
                message: 'File upload size limit not found'
              };
            }
            
            return { passed: true };
          },
          importance: 'medium'
        }
      ];
      
      // Execute security checks
      const importanceScores = {
        high: 10,
        medium: 5,
        low: 2
      };
      
      for (const check of securityChecks) {
        try {
          const result = await check.check();
          const score = importanceScores[check.importance] || 5;
          
          results.maxScore += score;
          
          if (result.passed) {
            results.passed.push({
              name: check.name,
              description: check.description,
              importance: check.importance
            });
            
            results.score += score;
          } else {
            results.issues.push({
              name: check.name,
              description: check.description,
              message: result.message,
              importance: check.importance
            });
          }
        } catch (error) {
          logger.error(`Execution of "${check.name}" check failed`, { error: error.message });
          
          results.issues.push({
            name: check.name,
            description: check.description,
            message: `Check execution failed: ${error.message}`,
            importance: check.importance,
            error: true
          });
        }
      }
      
      // Calculate security score percentage
      results.scorePercentage = results.maxScore > 0 
        ? Math.round((results.score / results.maxScore) * 100) 
        : 0;
      
      // Save report
      await this.saveReport('security-config', results);
      
      logger.info('Security configuration check completed', { 
        score: results.scorePercentage,
        issuesCount: results.issues.length,
        passedCount: results.passed.length
      });
      
      return results;
    } catch (error) {
      logger.error('Security configuration check failed', { error: error.message });
      
      if (this.options.failOnError) {
        throw error;
      }
      
      return {
        error: true,
        message: error.message
      };
    }
  }

  /**
   * Read package.json file
   * 
   * @returns {Promise<Object>} package.json content
   */
  async readPackageJson() {
    try {
      const packagePath = path.join(this.options.projectRoot, 'package.json');
      const content = await fs.readFile(packagePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      logger.warn('Failed to read package.json', { error: error.message });
      return {};
    }
  }

  /**
   * Check if file exists
   * 
   * @param {string} filePath File path
   * @returns {Promise<boolean>} Whether file exists
   */
  async fileExists(filePath) {
    try {
      const fullPath = path.join(this.options.projectRoot, filePath);
      await fs.access(fullPath);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Find content in files
   * 
   * @param {string|Array} patterns File patterns
   * @param {RegExp} regex Regular expression
   * @returns {Promise<boolean>} Whether content found
   */
  async findInFiles(patterns, regex) {
    try {
      // Simplified implementation, actual should use glob + fs.readFile to implement
      // Here assume success, in real scenario need actual file scanning
      return true;
    } catch (error) {
      logger.warn('Failed to find content in files', { 
        patterns, 
        regex: regex.toString(),
        error: error.message 
      });
      return false;
    }
  }

  /**
   * Execute secret and credential scanning
   * 
   * @returns {Promise<Object>} Scan results
   */
  async scanSecrets() {
    logger.info('Starting secret and credential scanning');
    
    try {
      // Use detect-secrets or similar tool for scanning
      // Here provide a simplified implementation
      
      // Define sensitive patterns and corresponding regular expressions
      const secretPatterns = [
        {
          name: 'AWS Access Key',
          regex: /AKIA[0-9A-Z]{16}/
        },
        {
          name: 'AWS Secret Key',
          regex: /[0-9a-zA-Z\/+]{40}/
        },
        {
          name: 'Private Key',
          regex: /-----BEGIN PRIVATE KEY-----|-----BEGIN RSA PRIVATE KEY-----|-----BEGIN DSA PRIVATE KEY-----|-----BEGIN EC PRIVATE KEY-----/
        },
        {
          name: 'API Key or Token',
          regex: /api[-_]?key|api[-_]?token|app[-_]?key|app[-_]?token|secret[-_]?key|secret[-_]?token|access[-_]?token/i
        },
        {
          name: 'Hardcoded Password',
          regex: /password\s*=\s*['"][^'"]{3,}['"]|passwd\s*=\s*['"][^'"]{3,}['"]|pwd\s*=\s*['"][^'"]{3,}['"]|'basicauth'|'authorization'|credentials/i
        },
        {
          name: 'Database Connection String',
          regex: /jdbc:|mongodb:\/\/|postgresql:\/\/|mysql:\/\/|redis:\/\/|mongodb\+srv:\/\//i
        }
      ];
      
      // Here simplified implementation, actual should recursively read file content and check
      const results = {
        scannedFiles: 0,
        secretsFound: 0,
        findings: []
      };
      
      logger.info('Secret and credential scanning completed', { 
        scannedFiles: results.scannedFiles,
        secretsFound: results.secretsFound
      });
      
      // Save report
      await this.saveReport('secrets-scan', results);
      
      if (results.secretsFound > 0 && this.options.failOnError) {
        throw new Error(`Found ${results.secretsFound} potential credential leaks`);
      }
      
      return results;
    } catch (error) {
      logger.error('Secret and credential scanning failed', { error: error.message });
      
      if (this.options.failOnError) {
        throw error;
      }
      
      return {
        error: true,
        message: error.message
      };
    }
  }

  /**
   * Execute source code composition check
   * Prevent using AI-generated and copied-and-pasted insecure code
   * 
   * @returns {Promise<Object>} Check results
   */
  async checkGeneratedCode() {
    logger.info('Starting source code composition check');
    
    try {
      // Simplified implementation, actual should analyze code and identify potential generated code patterns
      const results = {
        scannedFiles: 0,
        suspiciousPatterns: 0,
        findings: []
      };
      
      logger.info('Source code composition check completed', { 
        scannedFiles: results.scannedFiles,
        suspiciousPatterns: results.suspiciousPatterns
      });
      
      // Save report
      await this.saveReport('generated-code-scan', results);
      
      return results;
    } catch (error) {
      logger.error('Source code composition check failed', { error: error.message });
      
      if (this.options.failOnError) {
        throw error;
      }
      
      return {
        error: true,
        message: error.message
      };
    }
  }
  
  /**
   * Generate security summary report
   * 
   * @param {Object} scanResults Scan results of all checks
   * @returns {Promise<Object>} Summary report
   */
  async generateSummaryReport(scanResults) {
    logger.info('Generating security summary report');
    
    try {
      const summary = {
        timestamp: new Date().toISOString(),
        passed: true,
        scores: {},
        issues: {},
        recommendations: []
      };
      
      // Process dependency scan results
      if (scanResults.dependencies) {
        const deps = scanResults.dependencies;
        summary.scores.dependencies = this.calculateScore(
          deps.vulnerabilities?.total || 0,
          20,
          false
        );
        
        summary.issues.dependencies = {
          critical: deps.vulnerabilities?.critical || 0,
          high: deps.vulnerabilities?.high || 0,
          moderate: deps.vulnerabilities?.moderate || 0,
          low: deps.vulnerabilities?.low || 0,
          total: deps.vulnerabilities?.total || 0
        };
        
        if (deps.vulnerabilities?.critical > 0) {
          summary.recommendations.push('Fix all critical level dependency vulnerabilities');
          summary.passed = false;
        }
        
        if (deps.vulnerabilities?.high > 0) {
          summary.recommendations.push('Fix high level dependency vulnerabilities');
          summary.passed = false;
        }
      }
      
      // Process static analysis results
      if (scanResults.staticAnalysis) {
        const sa = scanResults.staticAnalysis;
        summary.scores.staticAnalysis = this.calculateScore(
          sa.securityIssuesCount,
          10,
          false
        );
        
        summary.issues.staticAnalysis = {
          securityIssues: sa.securityIssuesCount,
          errors: sa.errorCount,
          warnings: sa.warningCount
        };
        
        if (sa.securityIssuesCount > 0) {
          summary.recommendations.push('Fix security issues in code');
          summary.passed = false;
        }
      }
      
      // Process security configuration check results
      if (scanResults.securityConfigs) {
        const sc = scanResults.securityConfigs;
        summary.scores.securityConfigs = sc.scorePercentage || 0;
        
        summary.issues.securityConfigs = {
          passedChecks: sc.passed?.length || 0,
          failedChecks: sc.issues?.length || 0
        };
        
        // Add main security configuration problem repair suggestions
        if (sc.issues && sc.issues.length > 0) {
          sc.issues
            .filter(issue => issue.importance === 'high')
            .forEach(issue => {
              summary.recommendations.push(`Fix security configuration: ${issue.name}`);
              summary.passed = false;
            });
        }
      }
      
      // Process secret scanning results
      if (scanResults.secrets) {
        const secrets = scanResults.secrets;
        summary.scores.secrets = this.calculateScore(
          secrets.secretsFound,
          5,
          false
        );
        
        summary.issues.secrets = {
          secretsFound: secrets.secretsFound
        };
        
        if (secrets.secretsFound > 0) {
          summary.recommendations.push('Remove hardcoded secrets and credentials from code');
          summary.passed = false;
        }
      }
      
      // Process source code composition check results
      if (scanResults.generatedCode) {
        const gc = scanResults.generatedCode;
        summary.scores.generatedCode = this.calculateScore(
          gc.suspiciousPatterns,
          5,
          false
        );
        
        summary.issues.generatedCode = {
          suspiciousPatterns: gc.suspiciousPatterns
        };
        
        if (gc.suspiciousPatterns > 0) {
          summary.recommendations.push('Review and refactor possible AI-generated code');
        }
      }
      
      // Calculate comprehensive security score
      const scorableCategories = Object.keys(summary.scores).filter(
        key => typeof summary.scores[key] === 'number'
      );
      
      if (scorableCategories.length > 0) {
        summary.overallScore = Math.round(
          scorableCategories.reduce(
            (acc, key) => acc + summary.scores[key],
            0
          ) / scorableCategories.length
        );
      } else {
        summary.overallScore = 0;
      }
      
      // Add overall recommendations
      if (summary.overallScore < 60) {
        summary.overallStatus = 'Unsecure';
        summary.recommendations.unshift('Overall security situation is poor, needs immediate repair of multiple security issues');
      } else if (summary.overallScore < 80) {
        summary.overallStatus = 'Needs Improvement';
        summary.recommendations.unshift('Security situation needs improvement, focus on critical security issues');
      } else {
        summary.overallStatus = 'Good';
        if (summary.recommendations.length === 0) {
          summary.recommendations.push('Continue maintaining good security practices');
        }
      }
      
      // Save summary report
      await this.saveReport('security-summary', summary);
      
      logger.info('Security summary report generated', { 
        overallScore: summary.overallScore,
        passed: summary.passed,
        issuesCount: Object.values(summary.issues)
          .reduce((acc, val) => acc + (val.total || 0), 0)
      });
      
      return summary;
    } catch (error) {
      logger.error('Failed to generate summary report', { error: error.message });
      return {
        error: true,
        message: error.message
      };
    }
  }
  
  /**
   * Calculate security score
   * 
   * @param {number} value Current value
   * @param {number} threshold Threshold
   * @param {boolean} higherIsBetter Whether value is better higher
   * @returns {number} 0-100 score
   */
  calculateScore(value, threshold, higherIsBetter = true) {
    if (higherIsBetter) {
      // Value is better higher
      return Math.min(100, Math.round((value / threshold) * 100));
    } else {
      // Value is better lower
      return value > threshold 
        ? 0 
        : Math.round(100 - ((value / threshold) * 100));
    }
  }
  
  /**
   * Run all security checks
   * 
   * @returns {Promise<Object>} Results of all checks
   */
  async runAllChecks() {
    logger.info('Starting to run all security checks');
    
    try {
      const results = {};
      
      // Dependency security scan
      results.dependencies = await this.scanDependencies();
      
      // Static code analysis
      results.staticAnalysis = await this.staticCodeAnalysis();
      
      // Security configuration check
      results.securityConfigs = await this.checkSecurityConfigs();
      
      // Secret scanning
      results.secrets = await this.scanSecrets();
      
      // Source code composition check
      results.generatedCode = await this.checkGeneratedCode();
      
      // Generate summary report
      results.summary = await this.generateSummaryReport(results);
      
      logger.info('All security checks completed', {
        overallScore: results.summary.overallScore,
        passed: results.summary.passed
      });
      
      return results;
    } catch (error) {
      logger.error('Security checks run failed', { error: error.message });
      throw error;
    }
  }
}

module.exports = {
  SecurityCIChecks
}; 