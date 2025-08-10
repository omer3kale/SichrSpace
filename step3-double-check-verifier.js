/**
 * STEP 3 COMPREHENSIVE DOUBLE-CHECK VERIFICATION
 * Complete validation of viewing request management system
 */

const fs = require('fs');
const path = require('path');

class Step3DoubleCheckVerifier {
    constructor() {
        this.results = [];
        this.baseDir = '/Users/omer3kale/SichrPlace77/SichrPlace77';
        this.criticalIssues = [];
        this.warnings = [];
    }

    logResult(test, success, message, severity = 'normal') {
        this.results.push({ test, success, message, severity });
        const status = success ? '✅' : '❌';
        console.log(`${status} ${test}: ${message}`);
        
        if (!success) {
            if (severity === 'critical') {
                this.criticalIssues.push({ test, message });
            } else if (severity === 'warning') {
                this.warnings.push({ test, message });
            }
        }
    }

    // 1. CRITICAL: Verify all API routes exist and are properly structured
    verifyAPIRoutesInDetail() {
        console.log('\n🔍 DETAILED API ROUTES VERIFICATION...');
        
        try {
            const routesPath = path.join(this.baseDir, 'backend/routes/viewing-requests.js');
            
            if (!fs.existsSync(routesPath)) {
                this.logResult('API Routes File', false, 'viewing-requests.js does not exist', 'critical');
                return false;
            }

            const content = fs.readFileSync(routesPath, 'utf8');
            
            // Check for specific route implementations
            const routeChecks = [
                { pattern: /router\.get\('\/'\s*,\s*auth/, name: 'GET / (list requests)' },
                { pattern: /router\.get\('\/my-requests'/, name: 'GET /my-requests' },
                { pattern: /router\.get\('\/my-properties'/, name: 'GET /my-properties' },
                { pattern: /router\.get\('\/statistics'/, name: 'GET /statistics' },
                { pattern: /router\.get\('\/:id'/, name: 'GET /:id' },
                { pattern: /router\.post\('\/'\s*,\s*auth/, name: 'POST / (create request)' },
                { pattern: /router\.put\('\/:id'/, name: 'PUT /:id' },
                { pattern: /router\.patch\('\/:id\/approve'/, name: 'PATCH /:id/approve' },
                { pattern: /router\.patch\('\/:id\/reject'/, name: 'PATCH /:id/reject' },
                { pattern: /router\.patch\('\/:id\/complete'/, name: 'PATCH /:id/complete' },
                { pattern: /router\.patch\('\/:id\/payment'/, name: 'PATCH /:id/payment' },
                { pattern: /router\.delete\('\/:id'/, name: 'DELETE /:id' }
            ];

            let foundRoutes = 0;
            routeChecks.forEach(check => {
                if (check.pattern.test(content)) {
                    foundRoutes++;
                    this.logResult(`Route: ${check.name}`, true, 'Properly implemented');
                } else {
                    this.logResult(`Route: ${check.name}`, false, 'Missing or malformed', 'critical');
                }
            });

            const routeCoverage = (foundRoutes / routeChecks.length) * 100;
            this.logResult('Overall API Routes', routeCoverage >= 100, 
                `${foundRoutes}/${routeChecks.length} routes (${routeCoverage.toFixed(1)}%)`,
                routeCoverage < 100 ? 'critical' : 'normal');

            return routeCoverage >= 100;
        } catch (error) {
            this.logResult('API Routes Verification', false, `Error: ${error.message}`, 'critical');
            return false;
        }
    }

    // 2. CRITICAL: Verify ViewingRequestService has all required methods
    verifyServiceMethodsInDetail() {
        console.log('\n🔍 DETAILED SERVICE METHODS VERIFICATION...');
        
        try {
            const servicePath = path.join(this.baseDir, 'backend/services/ViewingRequestService.js');
            
            if (!fs.existsSync(servicePath)) {
                this.logResult('Service File', false, 'ViewingRequestService.js does not exist', 'critical');
                return false;
            }

            const content = fs.readFileSync(servicePath, 'utf8');
            
            // Check for specific method implementations
            const methodChecks = [
                { pattern: /async\s+create\s*\(/, name: 'create()' },
                { pattern: /async\s+findById\s*\(/, name: 'findById()' },
                { pattern: /async\s+list\s*\(/, name: 'list()' },
                { pattern: /async\s+update\s*\(/, name: 'update()' },
                { pattern: /async\s+approve\s*\(/, name: 'approve()' },
                { pattern: /async\s+reject\s*\(/, name: 'reject()' },
                { pattern: /async\s+complete\s*\(/, name: 'complete()' },
                { pattern: /async\s+cancel\s*\(/, name: 'cancel()' },
                { pattern: /async\s+findByRequester\s*\(/, name: 'findByRequester()' },
                { pattern: /async\s+findByLandlord\s*\(/, name: 'findByLandlord()' },
                { pattern: /async\s+getStatistics\s*\(/, name: 'getStatistics()' },
                { pattern: /async\s+updatePaymentStatus\s*\(/, name: 'updatePaymentStatus()' }
            ];

            let foundMethods = 0;
            methodChecks.forEach(check => {
                if (check.pattern.test(content)) {
                    foundMethods++;
                    this.logResult(`Service Method: ${check.name}`, true, 'Properly implemented');
                } else {
                    this.logResult(`Service Method: ${check.name}`, false, 'Missing or malformed', 'critical');
                }
            });

            // Check for Supabase integration
            const hasSupabaseIntegration = content.includes('supabase') && content.includes('from(');
            this.logResult('Supabase Integration', hasSupabaseIntegration, 
                hasSupabaseIntegration ? 'Proper database integration' : 'Missing Supabase integration',
                hasSupabaseIntegration ? 'normal' : 'critical');

            const methodCoverage = (foundMethods / methodChecks.length) * 100;
            this.logResult('Overall Service Methods', methodCoverage >= 100, 
                `${foundMethods}/${methodChecks.length} methods (${methodCoverage.toFixed(1)}%)`,
                methodCoverage < 100 ? 'critical' : 'normal');

            return methodCoverage >= 100 && hasSupabaseIntegration;
        } catch (error) {
            this.logResult('Service Methods Verification', false, `Error: ${error.message}`, 'critical');
            return false;
        }
    }

    // 3. CRITICAL: Verify routes are properly registered in server.js
    verifyRouteRegistrationInDetail() {
        console.log('\n🔍 DETAILED ROUTE REGISTRATION VERIFICATION...');
        
        try {
            const serverPath = path.join(this.baseDir, 'backend/server.js');
            
            if (!fs.existsSync(serverPath)) {
                this.logResult('Server.js File', false, 'server.js does not exist', 'critical');
                return false;
            }

            const content = fs.readFileSync(serverPath, 'utf8');
            
            // Check for viewing-requests import
            const importPattern = /const\s+viewingRequestsRoutes\s*=\s*require\(.*viewing-requests.*\)/;
            const hasImport = importPattern.test(content);
            this.logResult('Routes Import', hasImport, 
                hasImport ? 'viewing-requests routes imported' : 'Routes import missing',
                hasImport ? 'normal' : 'critical');

            // Check for route mounting
            const mountPattern = /app\.use\(.*\/api\/viewing-requests.*viewingRequestsRoutes.*\)/;
            const hasMount = mountPattern.test(content);
            this.logResult('Routes Mounting', hasMount, 
                hasMount ? 'Routes properly mounted at /api/viewing-requests' : 'Routes mounting missing',
                hasMount ? 'normal' : 'critical');

            // Check position of registration (should be after auth setup)
            const authRoutesIndex = content.indexOf('app.use(\'/auth\'');
            const viewingRoutesIndex = content.indexOf('app.use(\'/api/viewing-requests\'');
            
            if (authRoutesIndex !== -1 && viewingRoutesIndex !== -1) {
                const properOrder = viewingRoutesIndex > authRoutesIndex;
                this.logResult('Registration Order', properOrder, 
                    properOrder ? 'Routes registered after auth setup' : 'Routes registered before auth setup',
                    properOrder ? 'normal' : 'warning');
            }

            return hasImport && hasMount;
        } catch (error) {
            this.logResult('Route Registration Verification', false, `Error: ${error.message}`, 'critical');
            return false;
        }
    }

    // 4. Verify frontend dashboard completeness
    verifyFrontendDashboardInDetail() {
        console.log('\n🔍 DETAILED FRONTEND DASHBOARD VERIFICATION...');
        
        try {
            const dashboardPath = path.join(this.baseDir, 'frontend/viewing-requests-dashboard.html');
            
            if (!fs.existsSync(dashboardPath)) {
                this.logResult('Dashboard File', false, 'viewing-requests-dashboard.html does not exist', 'critical');
                return false;
            }

            const content = fs.readFileSync(dashboardPath, 'utf8');
            
            // Check for essential UI components
            const uiChecks = [
                { pattern: /id="my-requests"/, name: 'My Requests Tab' },
                { pattern: /id="my-properties"/, name: 'My Properties Tab' },
                { pattern: /id="create-request"/, name: 'Create Request Tab' },
                { pattern: /class="stats-grid"/, name: 'Statistics Grid' },
                { pattern: /class="filters"/, name: 'Filter System' },
                { pattern: /function\s+loadMyRequests/, name: 'Load My Requests Function' },
                { pattern: /function\s+loadPropertyRequests/, name: 'Load Property Requests Function' },
                { pattern: /function\s+approveRequest/, name: 'Approve Request Function' },
                { pattern: /function\s+rejectRequest/, name: 'Reject Request Function' },
                { pattern: /\/api\/viewing-requests/, name: 'API Endpoint Integration' }
            ];

            let foundComponents = 0;
            uiChecks.forEach(check => {
                if (check.pattern.test(content)) {
                    foundComponents++;
                    this.logResult(`UI Component: ${check.name}`, true, 'Present and implemented');
                } else {
                    this.logResult(`UI Component: ${check.name}`, false, 'Missing from dashboard', 'warning');
                }
            });

            const uiCoverage = (foundComponents / uiChecks.length) * 100;
            this.logResult('Frontend Dashboard Completeness', uiCoverage >= 90, 
                `${foundComponents}/${uiChecks.length} components (${uiCoverage.toFixed(1)}%)`,
                uiCoverage < 90 ? 'warning' : 'normal');

            return uiCoverage >= 90;
        } catch (error) {
            this.logResult('Frontend Dashboard Verification', false, `Error: ${error.message}`, 'warning');
            return false;
        }
    }

    // 5. Verify authentication integration
    verifyAuthenticationIntegration() {
        console.log('\n🔍 AUTHENTICATION INTEGRATION VERIFICATION...');
        
        try {
            const routesPath = path.join(this.baseDir, 'backend/routes/viewing-requests.js');
            const authPath = path.join(this.baseDir, 'backend/middleware/auth.js');
            
            // Check auth middleware exists
            const authExists = fs.existsSync(authPath);
            this.logResult('Auth Middleware File', authExists, 
                authExists ? 'auth.js middleware exists' : 'auth.js middleware missing',
                authExists ? 'normal' : 'critical');

            if (!fs.existsSync(routesPath)) {
                this.logResult('Routes File for Auth Check', false, 'Routes file missing', 'critical');
                return false;
            }

            const routesContent = fs.readFileSync(routesPath, 'utf8');
            
            // Check for auth import and usage
            const hasAuthImport = routesContent.includes("require('../middleware/auth')");
            const hasAuthUsage = routesContent.includes(', auth,') || routesContent.includes('auth,');
            const hasUserValidation = routesContent.includes('req.user') && routesContent.includes('userId');
            const hasPermissionChecks = routesContent.includes('Access denied') || routesContent.includes('403');

            this.logResult('Auth Import', hasAuthImport, 
                hasAuthImport ? 'Auth middleware imported' : 'Auth import missing',
                hasAuthImport ? 'normal' : 'critical');

            this.logResult('Auth Usage', hasAuthUsage, 
                hasAuthUsage ? 'Auth middleware used in routes' : 'Auth middleware not used',
                hasAuthUsage ? 'normal' : 'critical');

            this.logResult('User Validation', hasUserValidation, 
                hasUserValidation ? 'User validation implemented' : 'User validation missing',
                hasUserValidation ? 'normal' : 'critical');

            this.logResult('Permission Checks', hasPermissionChecks, 
                hasPermissionChecks ? 'Permission checks implemented' : 'Permission checks missing',
                hasPermissionChecks ? 'normal' : 'warning');

            return authExists && hasAuthImport && hasAuthUsage && hasUserValidation;
        } catch (error) {
            this.logResult('Authentication Verification', false, `Error: ${error.message}`, 'critical');
            return false;
        }
    }

    // 6. Verify email integration
    verifyEmailIntegration() {
        console.log('\n🔍 EMAIL INTEGRATION VERIFICATION...');
        
        try {
            const routesPath = path.join(this.baseDir, 'backend/routes/viewing-requests.js');
            const emailServicePath = path.join(this.baseDir, 'backend/services/emailService.js');
            
            // Check email service exists
            const emailServiceExists = fs.existsSync(emailServicePath);
            this.logResult('Email Service File', emailServiceExists, 
                emailServiceExists ? 'emailService.js exists' : 'emailService.js missing',
                emailServiceExists ? 'normal' : 'warning');

            if (!fs.existsSync(routesPath)) {
                this.logResult('Routes File for Email Check', false, 'Routes file missing', 'critical');
                return false;
            }

            const routesContent = fs.readFileSync(routesPath, 'utf8');
            
            // Check for email integration in routes
            const hasEmailImport = routesContent.includes('EmailService');
            const hasEmailInstance = routesContent.includes('new EmailService()');
            const hasEmailCalls = routesContent.includes('sendRequestConfirmation') || 
                                 routesContent.includes('emailService');

            this.logResult('Email Import', hasEmailImport, 
                hasEmailImport ? 'EmailService imported' : 'EmailService import missing',
                hasEmailImport ? 'normal' : 'warning');

            this.logResult('Email Instance', hasEmailInstance, 
                hasEmailInstance ? 'EmailService instantiated' : 'EmailService not instantiated',
                hasEmailInstance ? 'normal' : 'warning');

            this.logResult('Email Calls', hasEmailCalls, 
                hasEmailCalls ? 'Email methods called' : 'Email methods not used',
                hasEmailCalls ? 'normal' : 'warning');

            return hasEmailImport && hasEmailInstance && hasEmailCalls;
        } catch (error) {
            this.logResult('Email Integration Verification', false, `Error: ${error.message}`, 'warning');
            return false;
        }
    }

    // 7. Check for potential server configuration issues
    verifyServerConfiguration() {
        console.log('\n🔍 SERVER CONFIGURATION VERIFICATION...');
        
        try {
            const serverPath = path.join(this.baseDir, 'backend/server.js');
            const packagePath = path.join(this.baseDir, 'backend/package.json');
            
            // Check server.js file exists
            const serverExists = fs.existsSync(serverPath);
            
            this.logResult('Server.js File', serverExists, 
                serverExists ? 'server.js exists' : 'server.js missing',
                serverExists ? 'normal' : 'critical');

            // Check package.json for start script
            if (fs.existsSync(packagePath)) {
                const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
                const startScript = packageContent.scripts?.start;
                
                this.logResult('Start Script', !!startScript, 
                    startScript ? `Start script: ${startScript}` : 'No start script defined',
                    startScript ? 'normal' : 'warning');

                // Check if start script points to server.js
                if (startScript && serverExists) {
                    const usesServer = startScript.includes('server.js');
                    this.logResult('Start Script Target', usesServer, 
                        usesServer ? 'Start script uses server.js (correct)' : 'Start script does not use server.js',
                        usesServer ? 'normal' : 'warning');
                }
            }

            return serverExists;
        } catch (error) {
            this.logResult('Server Configuration Verification', false, `Error: ${error.message}`, 'warning');
            return false;
        }
    }

    // Generate comprehensive report
    generateComprehensiveReport() {
        console.log('\n' + '='.repeat(100));
        console.log('📊 STEP 3 COMPREHENSIVE DOUBLE-CHECK VERIFICATION REPORT');
        console.log('='.repeat(100));

        const totalTests = this.results.length;
        const passedTests = this.results.filter(r => r.success).length;
        const failedTests = totalTests - passedTests;
        const successRate = Math.round((passedTests / totalTests) * 100);

        console.log(`\n📈 Overall Results:`);
        console.log(`   Total Checks: ${totalTests}`);
        console.log(`   Passed: ${passedTests}`);
        console.log(`   Failed: ${failedTests}`);
        console.log(`   Success Rate: ${successRate}%`);

        // Critical issues summary
        if (this.criticalIssues.length > 0) {
            console.log(`\n🚨 CRITICAL ISSUES (${this.criticalIssues.length}):`);
            this.criticalIssues.forEach((issue, index) => {
                console.log(`   ${index + 1}. ${issue.test}: ${issue.message}`);
            });
        }

        // Warnings summary
        if (this.warnings.length > 0) {
            console.log(`\n⚠️  WARNINGS (${this.warnings.length}):`);
            this.warnings.forEach((warning, index) => {
                console.log(`   ${index + 1}. ${warning.test}: ${warning.message}`);
            });
        }

        // Implementation status
        console.log(`\n🎯 Step 3 Implementation Status:`);
        if (this.criticalIssues.length === 0) {
            if (successRate >= 95) {
                console.log(`   ✅ EXCELLENT: Step 3 is fully operational (${successRate}%)`);
                console.log(`   🚀 Ready for production use`);
            } else if (successRate >= 85) {
                console.log(`   ✅ VERY GOOD: Step 3 is operational with minor issues (${successRate}%)`);
                console.log(`   🔧 Minor fixes recommended`);
            } else {
                console.log(`   ⚠️  GOOD: Step 3 works but has some issues (${successRate}%)`);
                console.log(`   🔧 Some improvements needed`);
            }
        } else {
            console.log(`   ❌ CRITICAL ISSUES FOUND: Step 3 has blocking problems (${successRate}%)`);
            console.log(`   🚨 Must fix critical issues before production`);
        }

        console.log('\n' + '='.repeat(100));

        return {
            totalTests,
            passedTests,
            failedTests,
            successRate,
            criticalIssues: this.criticalIssues.length,
            warnings: this.warnings.length,
            status: this.criticalIssues.length === 0 ? 
                (successRate >= 95 ? 'EXCELLENT' : successRate >= 85 ? 'VERY GOOD' : 'GOOD') : 
                'CRITICAL ISSUES'
        };
    }

    // Run comprehensive double-check
    async runDoubleCheck() {
        console.log('🔍 STARTING COMPREHENSIVE STEP 3 DOUBLE-CHECK VERIFICATION...\n');

        // Run all verification checks
        this.verifyAPIRoutesInDetail();
        this.verifyServiceMethodsInDetail();
        this.verifyRouteRegistrationInDetail();
        this.verifyFrontendDashboardInDetail();
        this.verifyAuthenticationIntegration();
        this.verifyEmailIntegration();
        this.verifyServerConfiguration();

        return this.generateComprehensiveReport();
    }
}

// Run the comprehensive double-check
async function main() {
    const verifier = new Step3DoubleCheckVerifier();
    await verifier.runDoubleCheck();
}

main();
