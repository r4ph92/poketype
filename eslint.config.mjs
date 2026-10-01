import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import { defineConfig, globalIgnores } from 'eslint/config';

const visibleAttributes = '/^(alt|title|placeholder|aria-label|aria-description|aria-roledescription)$/';

export default defineConfig([
  ...nextCoreWebVitals,
  ...nextTypescript,
  globalIgnores(['.next/**', 'node_modules/**', '.claude/**', 'drizzle/**', 'playwright-report/**', 'test-results/**', 'next-env.d.ts']),
  {
    files: ['src/**/*.tsx'],
    rules: {
      'react/jsx-no-literals': ['error', { noStrings: true, ignoreProps: true }],
      'no-restricted-syntax': [
        'error',
        {
          selector: `JSXAttribute[name.name=${visibleAttributes}] > Literal`,
          message: 'User-facing attributes must come from the message catalog.',
        },
        {
          selector: `JSXAttribute[name.name=${visibleAttributes}] > JSXExpressionContainer > :matches(Literal, TemplateLiteral)`,
          message: 'User-facing attributes must come from the message catalog.',
        },
        {
          selector: `JSXAttribute[name.name=${visibleAttributes}] > JSXExpressionContainer > :matches(ConditionalExpression, LogicalExpression) > :matches(Literal, TemplateLiteral)`,
          message: 'User-facing attributes must come from the message catalog.',
        },
        {
          selector: `:matches(JSXElement, JSXFragment) > JSXExpressionContainer > :matches(ConditionalExpression, LogicalExpression) > :matches(Literal[raw=/^['"]/], TemplateLiteral)`,
          message: 'Visible strings must come from the message catalog.',
        },
      ],
    },
  },
]);
