# RealStack Security Module

This directory contains security enhancements for the RealStack platform.

## New Directory Structure

We have reorganized the security module into a more streamlined structure. The new structure is located in the `src` directory:

```
enhancements/security/src/
```

Please refer to the [Security Module Documentation](./src/README.md) for detailed information on the new structure and usage.

## Features

The RealStack Security Module provides:

- **Authentication and Authorization**: Secure user authentication with multi-factor authentication, JWT token management, and role-based access control.
- **Encryption**: Data encryption services for sensitive information, supporting both symmetric and asymmetric encryption.
- **Blockchain Security**: Transaction validation, wallet security, and protection against common blockchain attacks.
- **Security Middleware**: Rate limiting, CSRF protection, and other security middleware for web applications.
- **CI/CD Security**: Automated security checks for continuous integration and deployment pipelines.
- **Logging and Monitoring**: Security-focused logging and monitoring utilities.
- **Documentation**: Comprehensive security guides for users, developers, and operations teams.

## Getting Started

To use the security module in your application:

```javascript
const security = require('enhancements/security/src');

// Initialize all security components
const securityComponents = security.initializeSecurity();

// Use individual components
const { authentication, encryption, middleware } = securityComponents;
```

For more detailed examples and documentation, please refer to the [Security Module Documentation](./src/README.md). 