/**
 * Step 3 Implementation Verification
 * Verifies code structure and implementation completeness
 */

const fs = require('fs');
const path = require('path');

class Step3ImplementationVerifier {
    constructor() {
        this.results = [];
        this.baseDir = '/Users/omer3kale/SichrPlace77/SichrPlace77';
    }

    logResult(test, success, message, details = null) {
        this.results.push({ test, success, message, details });
        const status = success ? '✅' : '❌';
        console.log(`${status} ${test}: ${message}`);
        if (details) console.log(`   Details: ${details}`);
    }

    // Check if viewing requests routes file exists and has proper structure
    verifyViewingRequestsRoutes() {
        try {
            const routesPath = path.join(this.baseDir, 'backend/routes/viewing-requests.js');
            
            if (!fs.existsSync(routesPath)) {
                this.logResult('Viewing Requests Routes', false, 'Routes file does not exist');
                return false;
            }

            const content = fs.readFileSync(routesPath, 'utf8');
            
            // Check for key endpoints
            const requiredEndpoints = [
                'GET /api/viewing-requests',
                'GET /api/viewing-requests/my-requests',
                'GET /api/viewing-requests/my-properties',
                'GET /api/viewing-requests/statistics',
                'POST /api/viewing-requests',
                'PUT /api/viewing-requests/:id',
                'PATCH /api/viewing-requests/:id/approve',
                'PATCH /api/viewing-requests/:id/reject',
                'DELETE /api/viewing-requests/:id'
            ];

            const endpoints = [];
            if (content.includes("router.get('/', auth")) endpoints.push('GET /api/viewing-requests');
            if (content.includes("router.get('/my-requests'")) endpoints.push('GET /api/viewing-requests/my-requests');
            if (content.includes("router.get('/my-properties'")) endpoints.push('GET /api/viewing-requests/my-properties');
            if (content.includes("router.get('/statistics'")) endpoints.push('GET /api/viewing-requests/statistics');
            if (content.includes("router.post('/', auth")) endpoints.push('POST /api/viewing-requests');
            if (content.includes("router.put('/:id'")) endpoints.push('PUT /api/viewing-requests/:id');
            if (content.includes("router.patch('/:id/approve'")) endpoints.push('PATCH /api/viewing-requests/:id/approve');
            if (content.includes("router.patch('/:id/reject'")) endpoints.push('PATCH /api/viewing-requests/:id/reject');
            if (content.includes("router.delete('/:id'")) endpoints.push('DELETE /api/viewing-requests/:id');

            const coverage = (endpoints.length / requiredEndpoints.length) * 100;
            
            this.logResult('Viewing Requests Routes', 
                coverage >= 80, 
                `Routes implementation: ${endpoints.length}/${requiredEndpoints.length} endpoints (${coverage.toFixed(1)}%)`);
            
            return coverage >= 80;
        } catch (error) {
            this.logResult('Viewing Requests Routes', false, `Error checking routes: ${error.message}`);
            return false;
        }
    }

    // Check if routes are registered in app.js
    verifyRoutesRegistration() {
        try {
            const appPath = path.join(this.baseDir, 'backend/app.js');
            
            if (!fs.existsSync(appPath)) {
                this.logResult('Routes Registration', false, 'app.js file does not exist');
                return false;
            }

            const content = fs.readFileSync(appPath, 'utf8');
            
            const hasImport = content.includes("require('./routes/viewing-requests')");
            const hasMount = content.includes("app.use('/api/viewing-requests'");
            
            if (hasImport && hasMount) {
                this.logResult('Routes Registration', true, 'Viewing requests routes properly registered');
                return true;
            } else {
                this.logResult('Routes Registration', false, 
                    `Missing: ${!hasImport ? 'import' : ''} ${!hasMount ? 'mount' : ''}`);
                return false;
            }
        } catch (error) {
            this.logResult('Routes Registration', false, `Error checking registration: ${error.message}`);
            return false;
        }
    }

    // Check ViewingRequestService
    verifyViewingRequestService() {
        try {
            const servicePath = path.join(this.baseDir, 'backend/services/ViewingRequestService.js');
            
            if (!fs.existsSync(servicePath)) {
                this.logResult('Viewing Request Service', false, 'Service file does not exist');
                return false;
            }

            const content = fs.readFileSync(servicePath, 'utf8');
            
            const requiredMethods = [
                'create', 'findById', 'list', 'update', 
                'approve', 'reject', 'complete', 'cancel',
                'findByRequester', 'findByLandlord', 'getStatistics'
            ];

            const foundMethods = requiredMethods.filter(method => 
                content.includes(`${method}(`) || content.includes(`async ${method}(`)
            );

            const coverage = (foundMethods.length / requiredMethods.length) * 100;
            
            this.logResult('Viewing Request Service', 
                coverage >= 80, 
                `Service methods: ${foundMethods.length}/${requiredMethods.length} (${coverage.toFixed(1)}%)`);
            
            return coverage >= 80;
        } catch (error) {
            this.logResult('Viewing Request Service', false, `Error checking service: ${error.message}`);
            return false;
        }
    }

    // Check frontend dashboard
    verifyFrontendDashboard() {
        try {
            const dashboardPath = path.join(this.baseDir, 'frontend/viewing-requests-dashboard.html');
            
            if (!fs.existsSync(dashboardPath)) {
                this.logResult('Frontend Dashboard', false, 'Dashboard file does not exist');
                return false;
            }

            const content = fs.readFileSync(dashboardPath, 'utf8');
            
            const requiredFeatures = [
                'My Requests tab',
                'My Properties tab', 
                'Create Request tab',
                'Statistics display',
                'Filter functionality',
                'Request management actions'
            ];

            const features = [];
            if (content.includes('my-requests')) features.push('My Requests tab');
            if (content.includes('my-properties')) features.push('My Properties tab');
            if (content.includes('create-request')) features.push('Create Request tab');
            if (content.includes('stats-grid')) features.push('Statistics display');
            if (content.includes('filters')) features.push('Filter functionality');
            if (content.includes('approveRequest') || content.includes('rejectRequest')) features.push('Request management actions');

            const coverage = (features.length / requiredFeatures.length) * 100;
            
            this.logResult('Frontend Dashboard', 
                coverage >= 80, 
                `Dashboard features: ${features.length}/${requiredFeatures.length} (${coverage.toFixed(1)}%)`);
            
            return coverage >= 80;
        } catch (error) {
            this.logResult('Frontend Dashboard', false, `Error checking dashboard: ${error.message}`);
            return false;
        }
    }

    // Check Supabase integration
    verifySupabaseIntegration() {
        try {
            const servicePath = path.join(this.baseDir, 'backend/services/ViewingRequestService.js');
            
            if (!fs.existsSync(servicePath)) {
                this.logResult('Supabase Integration', false, 'Service file does not exist');
                return false;
            }

            const content = fs.readFileSync(servicePath, 'utf8');
            
            const hasSupabaseImport = content.includes('supabase');
            const hasTableReference = content.includes('viewing_requests');
            const hasAsyncOperations = content.includes('await');
            
            if (hasSupabaseImport && hasTableReference && hasAsyncOperations) {
                this.logResult('Supabase Integration', true, 'Proper Supabase integration detected');
                return true;
            } else {
                this.logResult('Supabase Integration', false, 
                    `Missing: ${!hasSupabaseImport ? 'supabase import' : ''} ${!hasTableReference ? 'table reference' : ''} ${!hasAsyncOperations ? 'async operations' : ''}`);
                return false;
            }
        } catch (error) {
            this.logResult('Supabase Integration', false, `Error checking integration: ${error.message}`);
            return false;
        }
    }

    // Check email integration
    verifyEmailIntegration() {
        try {
            const routesPath = path.join(this.baseDir, 'backend/routes/viewing-requests.js');
            const emailServicePath = path.join(this.baseDir, 'backend/services/emailService.js');
            
            if (!fs.existsSync(routesPath) || !fs.existsSync(emailServicePath)) {
                this.logResult('Email Integration', false, 'Required files missing');
                return false;
            }

            const routesContent = fs.readFileSync(routesPath, 'utf8');
            const emailContent = fs.readFileSync(emailServicePath, 'utf8');
            
            const hasEmailImport = routesContent.includes('EmailService');
            const hasEmailMethods = emailContent.includes('sendRequestConfirmation') || 
                                   emailContent.includes('sendViewingConfirmation');
            const hasEmailCalls = routesContent.includes('sendRequestConfirmation') || 
                                 routesContent.includes('emailService');
            
            if (hasEmailImport && hasEmailMethods && hasEmailCalls) {
                this.logResult('Email Integration', true, 'Email notifications properly integrated');
                return true;
            } else {
                this.logResult('Email Integration', false, 
                    `Missing: ${!hasEmailImport ? 'email import' : ''} ${!hasEmailMethods ? 'email methods' : ''} ${!hasEmailCalls ? 'email calls' : ''}`);
                return false;
            }
        } catch (error) {
            this.logResult('Email Integration', false, `Error checking email integration: ${error.message}`);
            return false;
        }
    }

    // Check authentication middleware
    verifyAuthentication() {
        try {
            const routesPath = path.join(this.baseDir, 'backend/routes/viewing-requests.js');
            
            if (!fs.existsSync(routesPath)) {
                this.logResult('Authentication', false, 'Routes file does not exist');
                return false;
            }

            const content = fs.readFileSync(routesPath, 'utf8');
            
            const hasAuthImport = content.includes("require('../middleware/auth')");
            const hasAuthMiddleware = content.includes(', auth,') || content.includes('auth,');
            const hasPermissionChecks = content.includes('req.user.id') && 
                                       content.includes('Access denied');
            
            if (hasAuthImport && hasAuthMiddleware && hasPermissionChecks) {
                this.logResult('Authentication', true, 'Proper authentication and authorization');
                return true;
            } else {
                this.logResult('Authentication', false, 
                    `Missing: ${!hasAuthImport ? 'auth import' : ''} ${!hasAuthMiddleware ? 'auth middleware' : ''} ${!hasPermissionChecks ? 'permission checks' : ''}`);
                return false;
            }
        } catch (error) {
            this.logResult('Authentication', false, `Error checking authentication: ${error.message}`);
            return false;
        }
    }

    // Generate comprehensive report
    generateReport() {
        console.log('\n' + '='.repeat(80));
        console.log('📊 STEP 3 VIEWING REQUEST SYSTEM - IMPLEMENTATION REPORT');
        console.log('='.repeat(80));

        const totalTests = this.results.length;
        const passedTests = this.results.filter(r => r.success).length;
        const failedTests = totalTests - passedTests;
        const successRate = Math.round((passedTests / totalTests) * 100);

        console.log(`\n📈 Implementation Results:`);
        console.log(`   Components Checked: ${totalTests}`);
        console.log(`   Implemented: ${passedTests}`);
        console.log(`   Missing/Issues: ${failedTests}`);
        console.log(`   Completion Rate: ${successRate}%`);

        console.log(`\n📋 Component Details:`);
        this.results.forEach((result, index) => {
            const status = result.success ? '✅' : '❌';
            console.log(`   ${index + 1}. ${status} ${result.test}`);
            if (!result.success) {
                console.log(`      └─ ${result.message}`);
            }
        });

        console.log(`\n🎯 Step 3 Implementation Status:`);
        if (successRate >= 90) {
            console.log(`   ✅ EXCELLENT: Step 3 is fully implemented (${successRate}%)`);
        } else if (successRate >= 70) {
            console.log(`   ⚠️  GOOD: Step 3 is mostly implemented (${successRate}%)`);
        } else if (successRate >= 50) {
            console.log(`   ⚠️  PARTIAL: Step 3 needs more work (${successRate}%)`);
        } else {
            console.log(`   ❌ INCOMPLETE: Step 3 requires significant work (${successRate}%)`);
        }

        console.log('\n🚀 Next Steps:');
        if (successRate >= 90) {
            console.log('   • Run server connectivity tests');
            console.log('   • Test frontend dashboard in browser');
            console.log('   • Verify database operations');
        } else {
            console.log('   • Fix implementation issues listed above');
            console.log('   • Complete missing components');
            console.log('   • Re-run verification');
        }

        console.log('\n' + '='.repeat(80));

        return {
            totalTests,
            passedTests,
            failedTests,
            successRate,
            status: successRate >= 90 ? 'EXCELLENT' : successRate >= 70 ? 'GOOD' : successRate >= 50 ? 'PARTIAL' : 'INCOMPLETE'
        };
    }

    // Run all verifications
    async runVerification() {
        console.log('🔍 Starting Step 3 Implementation Verification...\n');

        // Core implementation checks
        this.verifyViewingRequestsRoutes();
        this.verifyRoutesRegistration();
        this.verifyViewingRequestService();
        this.verifyFrontendDashboard();
        this.verifySupabaseIntegration();
        this.verifyEmailIntegration();
        this.verifyAuthentication();

        return this.generateReport();
    }
}

// Run the verification
async function main() {
    const verifier = new Step3ImplementationVerifier();
    await verifier.runVerification();
}

main();
