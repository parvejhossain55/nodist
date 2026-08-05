/** @type {import('jest').Config} */
const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('./tsconfig.json');

const moduleNameMapper = pathsToModuleNameMapper(compilerOptions.paths, {
  prefix: '<rootDir>/src/',
});

// `server.ts` and a few modules use bare `import ... from 'app'` (resolved via
// tsconfig baseUrl at build time) — map it explicitly for Jest.
moduleNameMapper['^app$'] = '<rootDir>/src/app.ts';

const shared = {
  testEnvironment: 'node',
  moduleNameMapper,
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.test.json' }],
  },
};

/** @type {import('jest').Config} */
module.exports = {
  projects: [
    {
      ...shared,
      displayName: 'unit',
      roots: ['<rootDir>/tests/unit'],
      setupFiles: ['<rootDir>/tests/setup/env.ts'],
    },
    {
      ...shared,
      displayName: 'integration',
      roots: ['<rootDir>/tests/integration'],
      setupFiles: ['<rootDir>/tests/setup/env.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.ts'],
      globalSetup: '<rootDir>/tests/integration/globalSetup.ts',
      globalTeardown: '<rootDir>/tests/integration/globalTeardown.ts',
      testTimeout: 30_000,
    },
  ],
  collectCoverageFrom: ['src/**/*.ts', '!src/server.ts'],
  coverageDirectory: 'coverage',
};
