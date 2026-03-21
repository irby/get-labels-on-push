module.exports = {
  testMatch: ['**.spec.ts'],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.(ts|tsx)?$': ['ts-jest', { useESM: true, tsconfig: { isolatedModules: true } }],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  testTimeout: 30000,
  clearMocks: true,
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/lib/', 'main.ts'],
};
