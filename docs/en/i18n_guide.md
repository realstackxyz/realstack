# Internationalization (i18n) Guide

This guide explains how to work with internationalization in the RealStack platform.

## Overview

RealStack supports multiple languages to serve a global community. Our i18n strategy focuses on:

1. Separating all UI text into language files
2. Supporting right-to-left (RTL) languages
3. Properly formatting dates, numbers, and currencies

## Supported Languages

Currently, RealStack supports the following languages:

| Language | Code | Status |
|----------|------|--------|
| English  | en   | Complete |
| Chinese  | zh   | Complete |
| Spanish  | es   | In Progress |
| Russian  | ru   | In Progress |
| Arabic   | ar   | Planned - RTL |

## Implementation

We use [react-i18next](https://react.i18next.com/) for our frontend internationalization needs.

### File Structure

```
apps/
└── frontend/
    └── src/
        └── i18n/
            ├── config.js       # i18n configuration
            ├── en/             # English translations
            │   ├── common.json
            │   ├── auth.json
            │   └── ...
            ├── zh/             # Chinese translations
            │   ├── common.json
            │   ├── auth.json
            │   └── ...
            └── ...
```

### Usage in Components

#### Basic Translation

```jsx
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t('common.welcome')}</h1>
      <p>{t('common.description')}</p>
    </div>
  );
}
```

#### Pluralization

```jsx
// For different amounts
{t('asset.count', { count: assets.length })}

// In translation file (en/assets.json):
{
  "count": "{{count}} asset",
  "count_plural": "{{count}} assets"
}
```

#### Interpolation

```jsx
// With variables
{t('user.greeting', { name: user.name })}

// In translation file:
{
  "greeting": "Hello, {{name}}!"
}
```

### Date and Number Formatting

We use the [Intl](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl) API for consistent date and number formatting:

```jsx
// Date formatting
const formatDate = (date, locale) => {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
};

// Currency formatting
const formatCurrency = (amount, locale, currency = 'USD') => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency
  }).format(amount);
};
```

## RTL Support

For right-to-left languages (like Arabic), we:

1. Set the `dir` attribute on the `html` element
2. Use CSS logical properties where possible:
   - `margin-inline-start` instead of `margin-left`
   - `padding-inline-end` instead of `padding-right`
3. Use flexbox `flex-direction: row-reverse` for layout when needed

## Adding a New Language

To add a new language:

1. Create a new folder under `src/i18n/` with the language code
2. Copy the structure of the English translation files
3. Translate all strings
4. Add the language to the i18n configuration:

```javascript
// in src/i18n/config.js
const resources = {
  en: {
    common: common_en,
    auth: auth_en,
    // ...
  },
  zh: {
    common: common_zh,
    auth: auth_zh,
    // ...
  },
  // Add your new language here
  fr: {
    common: common_fr,
    auth: auth_fr,
    // ...
  }
};
```

## Translation Process

1. Extract untranslated strings: We use i18next-scanner to extract strings
2. Send to translators: Export JSON files for professional translation
3. Import and review: Import translations and review for context

## Testing Translations

- Use pseudo-localization to test layouts with longer text
- Use the language switcher to verify all UI elements are properly translated
- Test RTL languages specifically for layout issues

## Backend Internationalization

For error messages, emails, and other backend text:

1. Store all strings in language-specific JSON files
2. Use the user's language preference from the request
3. Format dates and numbers according to locale

```javascript
// Example backend i18n usage
const messages = require(`../i18n/${userLang}/errors.json`);
return res.status(404).json({ message: messages.USER_NOT_FOUND });
```

## Best Practices

1. Never concatenate strings for translation
2. Use placeholders for dynamic content
3. Provide context for translators with comments
4. Test with expanded text (German and Finnish tend to be longer)
5. Don't hardcode formatting (dates, numbers, currencies)

## Resources

- [react-i18next Documentation](https://react.i18next.com/)
- [MDN Intl Documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl)
- [RTL Styling Guide](https://rtlstyling.com/) 