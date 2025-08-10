const fetch = require('node-fetch');

/**
 * Step 3 Viewing Request System - Comprehensive Test Suite
 * Tests all viewing request API endpoints and functionality
 */
class Step3ViewingRequestTest {
    constructor() {
        this.baseUrl = 'http://localhost:3000';
        this.testResults = [];
        this.authToken = null;
        this.testUserId = null;
        this.testApartmentId = null;
        this.testRequestId = null;
    }

    // Test result logging
    logResult(test, success, message, data = null) {
        this.testResults.push({
            test,
            success,
            message,
            data,
            timestamp: new Date().toISOString()
        });
        
        const status = success ? '✅' : '❌';
        console.log(`${status} ${test}: ${message}`);
        if (data && !success) {
            console.log('   Error details:', data);
        }
    }

    // Authentication setup
    async setupAuthentication() {
        try {
            // Try to create a test user or login
            const loginResponse = await fetch(`${this.baseUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'test@sichrplace.com',
                    password: 'testpassword123'
                })
            });

            if (loginResponse.ok) {
                const loginData = await loginResponse.json();
                this.authToken = loginData.token;
                this.testUserId = loginData.user.id;
                this.logResult('Authentication', true, 'Successfully authenticated test user');
                return true;
            } else {
                // Try to register if login fails
                const registerResponse = await fetch(`${this.baseUrl}/api/auth/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: 'testuser',
                        email: 'test@sichrplace.com',
                        password: 'testpassword123',
                        firstName: 'Test',
                        lastName: 'User'
                    })
                });

                if (registerResponse.ok) {
                    const registerData = await registerResponse.json();
                    this.authToken = registerData.token;
                    this.testUserId = registerData.user.id;
                    this.logResult('Authentication', true, 'Successfully registered and authenticated test user');
                    return true;
                }
            }

            this.logResult('Authentication', false, 'Failed to authenticate');
            return false;
        } catch (error) {
            this.logResult('Authentication', false, `Authentication error: ${error.message}`);
            return false;
        }
    }

    // Test apartment setup (needed for viewing requests)
    async setupTestApartment() {
        try {
            // First, try to get existing apartments
            const response = await fetch(`${this.baseUrl}/api/apartments`, {
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            });

            if (response.ok) {
                const apartments = await response.json();
                if (apartments.length > 0) {
                    this.testApartmentId = apartments[0].id;
                    this.logResult('Apartment Setup', true, `Using existing apartment: ${apartments[0].title}`);
                    return true;
                }
            }

            // Create a test apartment if none exist
            const createResponse = await fetch(`${this.baseUrl}/api/apartments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({
                    title: 'Test Apartment for Viewing Requests',
                    description: 'A test apartment for Step 3 viewing request system',
                    price: 1200,
                    location: 'Test City, Test Street 123',
                    bedrooms: 2,
                    bathrooms: 1,
                    size: 75
                })
            });

            if (createResponse.ok) {
                const apartment = await createResponse.json();
                this.testApartmentId = apartment.id;
                this.logResult('Apartment Setup', true, 'Created test apartment for viewing requests');
                return true;
            }

            this.logResult('Apartment Setup', false, 'Failed to setup test apartment');
            return false;
        } catch (error) {
            this.logResult('Apartment Setup', false, `Apartment setup error: ${error.message}`);
            return false;
        }
    }

    // Test 1: GET /api/viewing-requests (list all with filters)
    async testListViewingRequests() {
        try {
            const response = await fetch(`${this.baseUrl}/api/viewing-requests`, {
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.logResult('List Viewing Requests', true, `Retrieved ${data.data.length} viewing requests`);
                return true;
            } else {
                const error = await response.json();
                this.logResult('List Viewing Requests', false, 'Failed to list viewing requests', error);
                return false;
            }
        } catch (error) {
            this.logResult('List Viewing Requests', false, `Error: ${error.message}`);
            return false;
        }
    }

    // Test 2: GET /api/viewing-requests/my-requests
    async testGetMyRequests() {
        try {
            const response = await fetch(`${this.baseUrl}/api/viewing-requests/my-requests`, {
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.logResult('Get My Requests', true, `Retrieved ${data.count} user viewing requests`);
                return true;
            } else {
                const error = await response.json();
                this.logResult('Get My Requests', false, 'Failed to get user requests', error);
                return false;
            }
        } catch (error) {
            this.logResult('Get My Requests', false, `Error: ${error.message}`);
            return false;
        }
    }

    // Test 3: GET /api/viewing-requests/my-properties
    async testGetMyProperties() {
        try {
            const response = await fetch(`${this.baseUrl}/api/viewing-requests/my-properties`, {
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.logResult('Get My Properties', true, `Retrieved ${data.count} property viewing requests`);
                return true;
            } else {
                const error = await response.json();
                this.logResult('Get My Properties', false, 'Failed to get property requests', error);
                return false;
            }
        } catch (error) {
            this.logResult('Get My Properties', false, `Error: ${error.message}`);
            return false;
        }
    }

    // Test 4: GET /api/viewing-requests/statistics
    async testGetStatistics() {
        try {
            const response = await fetch(`${this.baseUrl}/api/viewing-requests/statistics`, {
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.logResult('Get Statistics', true, 'Retrieved viewing request statistics', data.data);
                return true;
            } else {
                const error = await response.json();
                this.logResult('Get Statistics', false, 'Failed to get statistics', error);
                return false;
            }
        } catch (error) {
            this.logResult('Get Statistics', false, `Error: ${error.message}`);
            return false;
        }
    }

    // Test 5: POST /api/viewing-requests (create new viewing request)
    async testCreateViewingRequest() {
        try {
            const requestData = {
                apartment_id: this.testApartmentId,
                requested_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
                alternative_date_1: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // Day after
                phone: '+1234567890',
                message: 'Test viewing request for Step 3 functionality',
                booking_fee: 25.00
            };

            const response = await fetch(`${this.baseUrl}/api/viewing-requests`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify(requestData)
            });

            if (response.ok) {
                const data = await response.json();
                this.testRequestId = data.data.id;
                this.logResult('Create Viewing Request', true, `Created viewing request: ${this.testRequestId}`);
                return true;
            } else {
                const error = await response.json();
                this.logResult('Create Viewing Request', false, 'Failed to create viewing request', error);
                return false;
            }
        } catch (error) {
            this.logResult('Create Viewing Request', false, `Error: ${error.message}`);
            return false;
        }
    }

    // Test 6: GET /api/viewing-requests/:id (get specific viewing request)
    async testGetSpecificRequest() {
        if (!this.testRequestId) {
            this.logResult('Get Specific Request', false, 'No test request ID available');
            return false;
        }

        try {
            const response = await fetch(`${this.baseUrl}/api/viewing-requests/${this.testRequestId}`, {
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            });

            if (response.ok) {
                const data = await response.json();
                this.logResult('Get Specific Request', true, `Retrieved request details for ${this.testRequestId}`);
                return true;
            } else {
                const error = await response.json();
                this.logResult('Get Specific Request', false, 'Failed to get specific request', error);
                return false;
            }
        } catch (error) {
            this.logResult('Get Specific Request', false, `Error: ${error.message}`);
            return false;
        }
    }

    // Test 7: PUT /api/viewing-requests/:id (update viewing request)
    async testUpdateViewingRequest() {
        if (!this.testRequestId) {
            this.logResult('Update Viewing Request', false, 'No test request ID available');
            return false;
        }

        try {
            const updateData = {
                message: 'Updated test viewing request message',
                phone: '+9876543210'
            };

            const response = await fetch(`${this.baseUrl}/api/viewing-requests/${this.testRequestId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify(updateData)
            });

            if (response.ok) {
                const data = await response.json();
                this.logResult('Update Viewing Request', true, 'Successfully updated viewing request');
                return true;
            } else {
                const error = await response.json();
                this.logResult('Update Viewing Request', false, 'Failed to update viewing request', error);
                return false;
            }
        } catch (error) {
            this.logResult('Update Viewing Request', false, `Error: ${error.message}`);
            return false;
        }
    }

    // Test 8: PATCH /api/viewing-requests/:id/payment (update payment status)
    async testUpdatePaymentStatus() {
        if (!this.testRequestId) {
            this.logResult('Update Payment Status', false, 'No test request ID available');
            return false;
        }

        try {
            const paymentData = {
                payment_status: 'completed',
                payment_id: 'test_payment_12345'
            };

            const response = await fetch(`${this.baseUrl}/api/viewing-requests/${this.testRequestId}/payment`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify(paymentData)
            });

            if (response.ok) {
                const data = await response.json();
                this.logResult('Update Payment Status', true, 'Successfully updated payment status');
                return true;
            } else {
                const error = await response.json();
                this.logResult('Update Payment Status', false, 'Failed to update payment status', error);
                return false;
            }
        } catch (error) {
            this.logResult('Update Payment Status', false, `Error: ${error.message}`);
            return false;
        }
    }

    // Test server connectivity
    async testServerConnectivity() {
        try {
            const response = await fetch(`${this.baseUrl}/api/apartments`);
            if (response.status === 401) {
                // 401 is expected for unauthenticated requests
                this.logResult('Server Connectivity', true, 'Server is responding correctly');
                return true;
            } else if (response.ok) {
                this.logResult('Server Connectivity', true, 'Server is responding correctly');
                return true;
            } else {
                this.logResult('Server Connectivity', false, `Server responded with status: ${response.status}`);
                return false;
            }
        } catch (error) {
            this.logResult('Server Connectivity', false, `Server connection error: ${error.message}`);
            return false;
        }
    }

    // Test route registration
    async testRouteRegistration() {
        try {
            const response = await fetch(`${this.baseUrl}/api/viewing-requests`, {
                method: 'OPTIONS'
            });

            // Check if the route exists (even if we get 404, it means the route is registered)
            if (response.status !== 404) {
                this.logResult('Route Registration', true, 'Viewing requests routes are properly registered');
                return true;
            } else {
                this.logResult('Route Registration', false, 'Viewing requests routes not found');
                return false;
            }
        } catch (error) {
            this.logResult('Route Registration', false, `Route registration error: ${error.message}`);
            return false;
        }
    }

    // Generate comprehensive test report
    generateReport() {
        console.log('\n' + '='.repeat(80));
        console.log('📊 STEP 3 VIEWING REQUEST SYSTEM - TEST REPORT');
        console.log('='.repeat(80));

        const totalTests = this.testResults.length;
        const passedTests = this.testResults.filter(r => r.success).length;
        const failedTests = totalTests - passedTests;
        const successRate = Math.round((passedTests / totalTests) * 100);

        console.log(`\n📈 Overall Results:`);
        console.log(`   Total Tests: ${totalTests}`);
        console.log(`   Passed: ${passedTests}`);
        console.log(`   Failed: ${failedTests}`);
        console.log(`   Success Rate: ${successRate}%`);

        console.log(`\n📋 Test Details:`);
        this.testResults.forEach((result, index) => {
            const status = result.success ? '✅' : '❌';
            console.log(`   ${index + 1}. ${status} ${result.test}`);
            if (!result.success) {
                console.log(`      └─ ${result.message}`);
            }
        });

        console.log(`\n🎯 Step 3 Implementation Status:`);
        if (successRate >= 90) {
            console.log(`   ✅ EXCELLENT: Step 3 is fully operational (${successRate}%)`);
        } else if (successRate >= 70) {
            console.log(`   ⚠️  GOOD: Step 3 is mostly working (${successRate}%)`);
        } else if (successRate >= 50) {
            console.log(`   ⚠️  PARTIAL: Step 3 has some issues (${successRate}%)`);
        } else {
            console.log(`   ❌ NEEDS WORK: Step 3 requires attention (${successRate}%)`);
        }

        console.log('\n' + '='.repeat(80));

        return {
            totalTests,
            passedTests,
            failedTests,
            successRate,
            status: successRate >= 90 ? 'EXCELLENT' : successRate >= 70 ? 'GOOD' : successRate >= 50 ? 'PARTIAL' : 'NEEDS WORK'
        };
    }

    // Run all tests
    async runAllTests() {
        console.log('🚀 Starting Step 3 Viewing Request System Tests...\n');

        // Basic connectivity tests
        await this.testServerConnectivity();
        await this.testRouteRegistration();

        // Authentication setup
        const authSuccess = await this.setupAuthentication();
        if (!authSuccess) {
            console.log('❌ Cannot proceed without authentication');
            return this.generateReport();
        }

        // Apartment setup
        const apartmentSuccess = await this.setupTestApartment();
        if (!apartmentSuccess) {
            console.log('❌ Cannot proceed without test apartment');
            return this.generateReport();
        }

        // Core viewing request tests
        await this.testListViewingRequests();
        await this.testGetMyRequests();
        await this.testGetMyProperties();
        await this.testGetStatistics();
        await this.testCreateViewingRequest();
        await this.testGetSpecificRequest();
        await this.testUpdateViewingRequest();
        await this.testUpdatePaymentStatus();

        return this.generateReport();
    }
}

// Run the tests
async function main() {
    const tester = new Step3ViewingRequestTest();
    await tester.runAllTests();
    process.exit(0);
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled promise rejection:', error);
    process.exit(1);
});

main();
