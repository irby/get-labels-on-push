module.exports = {
  testMatch: ['**.spec.ts'],
  transform: {
    '^.+\\.(ts|tsx)?$': 'ts-jest',
    "^.+\\.(js|jsx)$": "babel-jest",
  },
  testTimeout: 30000,
  clearMocks: true,
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/lib/', 'main.ts'],
};
