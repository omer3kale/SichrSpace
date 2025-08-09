# GDPR Test Suite Documentation

## Overview
This directory contains comprehensive tests for GDPR compliance across the SichrPlace platform.

## Test Files

### Core GDPR Tests
- **`gdpr.test.js`** - Core GDPR service functionality, consent management, requests
- **`advanced-gdpr.test.js`** - Advanced GDPR features, compliance monitoring, breach management
- **`gdpr-models.test.js`** - Data model validation and integrity tests

### API Route Tests
- **`routes-gdpr.test.js`** - Basic GDPR API endpoints (/api/gdpr/*)
- **`routes-advanced-gdpr.test.js`** - Advanced GDPR API endpoints (/api/advanced-gdpr/*)

### Frontend Tests
- **`frontend-gdpr.test.js`** - Frontend GDPR component testing
- **`cookie-consent.test.js`** - Cookie consent system testing

### Configuration Files
- **`package.json`** - Jest configuration and test scripts
- **`setup.js`** - Global test setup and utilities
- **`run-gdpr-tests.sh`** - Comprehensive test runner script

## Test Categories Covered

### ✅ Consent Management
- [x] Recording user consent
- [x] Granular consent options
- [x] Consent withdrawal
- [x] Consent expiry and renewal
- [x] Legal basis validation

### ✅ User Rights (GDPR Articles 15-22)
- [x] Right to Access (Article 15)
- [x] Right to Rectification (Article 16)
- [x] Right to Erasure (Article 17)
- [x] Right to Data Portability (Article 20)
- [x] Right to Restriction (Article 18)
- [x] Right to Object (Article 21)

### ✅ Data Processing
- [x] Processing activity logging
- [x] Legal basis tracking
- [x] Data retention management
- [x] Cross-border transfer compliance

### ✅ Data Breach Management
- [x] Breach detection and reporting
- [x] Risk assessment automation
- [x] Authority notification timelines
- [x] Individual notification requirements

### ✅ Privacy Impact Assessments (DPIA)
- [x] DPIA creation and management
- [x] Risk assessment algorithms
- [x] Stakeholder consultation workflows
- [x] Approval and review processes

### ✅ Compliance Monitoring
- [x] Automated compliance checks
- [x] Expired consent detection
- [x] Overdue request monitoring
- [x] Breach deadline tracking

### ✅ Frontend Compliance
- [x] Cookie consent banners
- [x] Privacy settings interface
- [x] GDPR request forms
- [x] Consent withdrawal UI

## Running Tests

### Run All GDPR Tests
```bash
./run-gdpr-tests.sh
```

### Run Individual Test Categories
```bash
npm run test:gdpr-all       # All GDPR tests
npm run test:routes         # Route tests only
npm run test:models         # Model tests only
npm run test:frontend       # Frontend tests only
```

### Run with Coverage
```bash
npm run test:coverage
```

### Watch Mode for Development
```bash
npm run test:watch
```

## Test Coverage Requirements

- **Minimum 80%** line coverage for all GDPR modules
- **100%** coverage for consent withdrawal flows
- **Complete coverage** for user rights endpoints
- **Full validation** for data breach reporting

## GDPR Compliance Validation

### Automated Checks
- ✅ Consent banner functionality
- ✅ User rights API endpoints
- ✅ Data processing logging
- ✅ Breach notification systems
- ✅ Privacy policy integration

### Manual Verification Required
- [ ] Legal basis documentation
- [ ] Data Processing Records (ROPA)
- [ ] Privacy policy accuracy
- [ ] Staff training records
- [ ] Third-party processor agreements

## Dependencies

- **Jest**: Testing framework
- **Supertest**: API endpoint testing
- **JSDOM**: DOM environment for frontend tests

## Environment Variables for Testing

```
NODE_ENV=test
JWT_SECRET=test-jwt-secret-for-gdpr-tests
SUPABASE_URL=https://test.supabase.co
SUPABASE_ANON_KEY=test-anon-key
```

## Mock Services

Tests include comprehensive mocking for:
- Supabase database operations
- External API calls
- Email services
- Authentication systems
- Analytics platforms

## Continuous Integration

Add to your CI/CD pipeline:
```yaml
- name: Run GDPR Compliance Tests
  run: |
    cd backend/tests
    npm install
    ./run-gdpr-tests.sh
```

## Test Data Management

- **Test isolation**: Each test uses isolated mock data
- **Data cleanup**: Automatic cleanup after each test
- **Realistic scenarios**: Tests use production-like data structures
- **Edge case coverage**: Comprehensive error condition testing

## Reporting

Test results include:
- Individual test pass/fail status
- Code coverage metrics
- GDPR compliance checklist
- Performance benchmarks
- Security validation results

## Support

For questions about GDPR testing:
1. Review test documentation
2. Check console output for detailed error messages
3. Verify environment configuration
4. Ensure all dependencies are installed

---

**Last Updated**: August 6, 2025
**Test Suite Version**: 1.0.0
**GDPR Compliance Level**: Production Ready ✅
