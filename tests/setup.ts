// Test setup file
// This file runs before all tests

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key-with-minimum-32-characters-for-security'
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.NODE_ENV = 'test'
