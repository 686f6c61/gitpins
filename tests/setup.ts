// Setup environment variables for tests
process.env.JWT_SECRET = 'test-jwt-secret-for-testing-only-32chars!'
process.env.ENCRYPTION_SECRET = 'test-encryption-secret-32chars!!'
process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000'
process.env.NODE_ENV = 'test'
