# Front-End Security Best Practices Guide

This guide outlines essential security practices for RealStack's front-end applications to protect against common vulnerabilities.

## Table of Contents
1. [Input Validation](#input-validation)
2. [Cross-Site Scripting (XSS) Prevention](#cross-site-scripting-xss-prevention)
3. [Cross-Site Request Forgery (CSRF) Protection](#cross-site-request-forgery-csrf-protection)
4. [Secure Storage of Sensitive Data](#secure-storage-of-sensitive-data)
5. [Secure Communication](#secure-communication)
6. [Content Security Policy](#content-security-policy)
7. [Dependency Management](#dependency-management)
8. [Authentication & Authorization](#authentication--authorization)
9. [Error Handling & Logging](#error-handling--logging)
10. [Security Testing](#security-testing)

## Input Validation

All user inputs must be validated on both client and server sides:

- Implement strict type checking for all inputs
- Use whitelisting for accepted characters/inputs rather than blacklisting
- Validate form inputs before submission
- Sanitize data before displaying it back to users
- Use parameterized queries for all database operations

Example implementation:
```javascript
// BAD
const userInput = document.getElementById('userInput').value;
document.getElementById('output').innerHTML = userInput; // XSS vulnerability

// GOOD
const userInput = document.getElementById('userInput').value;
// Validate input format
if (!/^[a-zA-Z0-9\s]+$/.test(userInput)) {
  showError('Invalid input format');
  return;
}
// Sanitize before display
document.getElementById('output').textContent = userInput; // Safe
```

## Cross-Site Scripting (XSS) Prevention

Prevent XSS by properly encoding output and using framework security features:

- Use React's built-in XSS protection by avoiding dangerouslySetInnerHTML
- For cases when HTML rendering is necessary, use a trusted library like DOMPurify
- Implement proper context-sensitive encoding for HTML, JavaScript, CSS, and URL contexts
- Use textContent instead of innerHTML when possible

Example implementation:
```javascript
// BAD
function DisplayComment({ comment }) {
  return <div dangerouslySetInnerHTML={{ __html: comment }} />; // XSS risk
}

// GOOD
import DOMPurify from 'dompurify';

function DisplayComment({ comment }) {
  // Only allow if HTML is absolutely necessary
  const sanitizedComment = DOMPurify.sanitize(comment, { 
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'], 
    ALLOWED_ATTR: ['href']
  });
  return <div dangerouslySetInnerHTML={{ __html: sanitizedComment }} />;
}

// BEST (when HTML isn't needed)
function DisplayComment({ comment }) {
  return <div>{comment}</div>; // React escapes this automatically
}
```

## Cross-Site Request Forgery (CSRF) Protection

Protect against CSRF attacks with these measures:

- Use anti-CSRF tokens for all state-changing operations
- Implement the SameSite cookie attribute (set to 'Strict' or 'Lax')
- Verify the origin header on server-side requests
- Use framework-specific CSRF protection (if available)

Example implementation:
```javascript
// In your API wrapper
async function apiRequest(endpoint, method, data) {
  const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
  
  return fetch(endpoint, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrfToken
    },
    credentials: 'same-origin', // Important for cookies
    body: JSON.stringify(data)
  });
}
```

## Secure Storage of Sensitive Data

Handle sensitive data carefully:

- Never store sensitive information in localStorage or sessionStorage
- Use secure, HttpOnly, SameSite cookies for authentication tokens
- Minimize storage of sensitive data in the browser
- Use the Web Crypto API for client-side encryption when needed
- Implement secure key management practices

Example implementation:
```javascript
// BAD
localStorage.setItem('authToken', token); // Vulnerable to XSS

// GOOD - Let the server handle tokens via secure cookies
// Set in server response headers:
// Set-Cookie: authToken=xyz; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=3600

// Then in client requests:
fetch('/api/data', {
  credentials: 'same-origin', // Sends cookies automatically
});
```

## Secure Communication

Ensure all communications are secure:

- Use HTTPS exclusively for all communications
- Implement HTTP Strict Transport Security (HSTS)
- Pin certificates for critical communications
- Validate server certificates properly
- Handle mixed content properly

Configuration example:
```javascript
// In your server setup
app.use(helmet.hsts({
  maxAge: 15552000, // 180 days in seconds
  includeSubDomains: true,
  preload: true
}));
```

## Content Security Policy

Implement a strict Content Security Policy:

- Define trusted sources for scripts, styles, images, fonts, etc.
- Disable unsafe inline scripts and eval()
- Use nonces or hashes for necessary inline scripts
- Monitor CSP violations

Example header:
```
Content-Security-Policy: default-src 'self'; 
  script-src 'self' https://trusted-cdn.com; 
  style-src 'self' https://trusted-cdn.com; 
  img-src 'self' https://trusted-image-cdn.com data:; 
  connect-src 'self' https://api.realstack.com; 
  font-src 'self' https://trusted-font-cdn.com; 
  frame-src 'none'; 
  object-src 'none'; 
  base-uri 'self';
  form-action 'self';
```

## Dependency Management

Maintain secure dependencies:

- Regularly audit dependencies with tools like npm audit or Snyk
- Pin dependency versions to prevent unexpected updates
- Use lock files (package-lock.json, yarn.lock)
- Monitor dependencies for security advisories
- Remove unused dependencies

Example workflow:
```bash
# Regular security checks
npm audit

# Fix vulnerabilities when possible
npm audit fix

# Update dependencies safely
npm outdated
npm update

# Use specific versions in package.json
"dependencies": {
  "react": "18.2.0",
  "lodash": "4.17.21"
}
```

## Authentication & Authorization

Implement robust authentication:

- Use a trusted authentication library or service
- Implement proper password policies
- Support multi-factor authentication
- Use short-lived JWTs or session tokens
- Implement proper logout functionality
- Apply the principle of least privilege

Example JWT validation:
```javascript
import { jwtVerify } from 'jose';

async function verifyToken(token) {
  try {
    const { payload } = await jwtVerify(
      token,
      publicKey,
      {
        issuer: 'https://realstack.com',
        audience: 'https://app.realstack.com',
        algorithms: ['ES256'],
        maxTokenAge: '1h',
      }
    );
    return payload;
  } catch (error) {
    console.error('Token validation failed:', error);
    throw new Error('Authentication failed');
  }
}
```

## Error Handling & Logging

Implement secure error handling:

- Avoid exposing sensitive information in error messages
- Implement centralized error handling
- Log security-relevant events securely
- Sanitize logs to prevent log injection
- Implement proper log rotation and retention

Example implementation:
```javascript
// Centralized error handler
function handleError(error, userContext = {}) {
  // Sanitize error for user display
  const userMessage = getUserFriendlyMessage(error);
  
  // Log details securely (no sensitive data)
  logger.error({
    message: error.message,
    code: error.code,
    userId: userContext.id,
    path: window.location.pathname,
    timestamp: new Date().toISOString(),
  });
  
  // Show user-friendly message
  showErrorToUser(userMessage);
}
```

## Security Testing

Implement regular security testing:

- Conduct regular security code reviews
- Implement automated security scanning in CI/CD
- Use tools like OWASP ZAP for vulnerability scanning
- Perform regular penetration testing
- Implement bug bounty program

Example testing setup:
```javascript
// In your package.json
{
  "scripts": {
    "test:security": "npm audit && eslint --config .eslint-security.json src/",
    "test:xss": "jest --testPathPattern='__tests__/security/xss.test.js'",
    "precommit": "npm run test:security"
  }
}
```

## Implementation Checklist

- [ ] Input validation implemented for all user inputs
- [ ] XSS prevention measures applied across all components
- [ ] CSRF protection implemented for all state-changing operations
- [ ] Secure storage practices implemented
- [ ] HTTPS enforced for all communications
- [ ] Content Security Policy implemented and tested
- [ ] Dependency security monitoring in place
- [ ] Authentication system reviewed for security
- [ ] Secure error handling and logging implemented
- [ ] Regular security testing scheduled

---

This document should be reviewed and updated regularly to adapt to evolving security threats and best practices. 