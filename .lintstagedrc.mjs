export default {
  'app/src/**/*.{ts,tsx}': (files) => [
    `pnpm --filter app exec eslint --no-error-on-unmatched-pattern ${files.join(' ')}`,
  ],
  'server/src/**/*.ts': (files) => [
    `pnpm --filter server exec eslint --no-error-on-unmatched-pattern ${files.join(' ')}`,
  ],
};
