# Security Policy

## Supported Versions

We currently support the following versions with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of RealStack code and the applications built on it seriously. If you believe you have found a security vulnerability, please follow these steps:

### DO NOT DISCLOSE THE VULNERABILITY PUBLICLY

1. **Email**: Send details to security@realstack.xyz
2. **Encryption**: Use our PGP key to encrypt sensitive information
3. **Details**: Include as much information as possible:
   - Type of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix if available

### What to expect

- **Acknowledgement**: We will acknowledge receipt within 24 hours
- **Updates**: We will provide regular updates on our progress
- **Disclosure**: We follow a 90-day disclosure policy

## Security Measures

RealStack incorporates several security measures to protect users and assets:

1. **Regular Audits**: 
   - Smart contracts audited by independent security firms
   - Automated security scans in CI/CD pipeline

2. **Security Best Practices**:
   - All dependencies regularly scanned for vulnerabilities
   - Input validation and output encoding to prevent injection attacks
   - Secure wallet interaction patterns

3. **Authentication and Authorization**:
   - JWT-based authentication with short expiration times
   - Role-based access control
   - Transaction signing for blockchain operations

## Security Recommendations for Users

1. **Wallet Security**:
   - Never share private keys or seed phrases
   - Use hardware wallets when possible
   - Keep wallet software updated

2. **Application Security**:
   - Use strong, unique passwords
   - Enable two-factor authentication when available
   - Verify transaction details before signing

3. **Development Best Practices**:
   - Pin dependencies to specific versions
   - Audit third-party dependencies
   - Follow secure coding guidelines

## Bug Bounty Program

We operate a private bug bounty program for security researchers. For more information, please contact us at security@realstack.xyz.

---

This security policy is subject to change without notice. 