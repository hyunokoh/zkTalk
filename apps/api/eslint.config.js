import config from '@zktalk/eslint-config/node';

export default [
  ...config,
  {
    files: ['src/**/__tests__/*.test.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
];
