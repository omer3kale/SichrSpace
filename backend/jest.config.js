module.exports = {
  // Test environment configuration
  testEnvironment: 'node',
  
  // Force exit to prevent hanging
  forceExit: true,
  detectOpenHandles: true,
  
  // Setup files
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup.js',
    '<rootDir>/tests/test-setup.js',
    '<rootDir>/tests/real-data-setup.js'
  ],
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js'
  ],
  
  // Ignore patterns to exclude legacy tests that reference old server structure
  testPathIgnorePatterns: [
    '/node_modules/',
    '/legacy-mongodb/tests/'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'api/**/*.js',
    '!api/**/node_modules/**',
    '!**/tests/**',
    '!**/coverage/**',
    '!server.js'
  ],
  
  coverageDirectory: 'coverage',
  
  coverageReporters: [
    'text',
    'text-summary', 
    'html',
    'lcov',
    'json'
  ],
  
  // Coverage thresholds for Step 4 APIs
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './api/profile.js': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './api/saved-searches.js': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './api/reviews.js': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './api/notifications.js': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    },
    './api/recently-viewed.js': {
      branches: 85,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Test execution settings
  verbose: true,
  collectCoverage: true,
  testTimeout: 10000,
  
  // Mock configurations
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
  
  // Module name mapping for aliases
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  
  // Transform settings
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Coverage ignore patterns
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/coverage/'
  ],
  
  // Test result processor
  testResultsProcessor: 'jest-sonar-reporter',
  
  // Reporter configuration
  reporters: [
    'default',
    [
      'jest-html-reporters',
      {
        publicPath: './coverage/html-report',
        filename: 'step4-test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Step 4 Enhanced User Experience - Test Report'
      }
    ]
  ]
};
