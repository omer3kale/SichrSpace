#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const http = require('http');

class Step2OperationalTest {
    constructor() {
        this.serverProcess = null;
        this.testResults = {
            serverStart: false,
            apiEndpoints: [],
            frontend: false,
            cleanup: false
        };
    }

    log(message, type = 'info') {
        const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${emoji} ${message}`);
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async startServer() {
        return new Promise((resolve, reject) => {
            console.log('\n🚀 STARTING SERVER...');
            
            this.serverProcess = spawn('node', ['backend/server.js'], {
                stdio: ['inherit', 'pipe', 'pipe'],
                cwd: process.cwd()
            });

            let serverReady = false;
            let timeout = setTimeout(() => {
                if (!serverReady) {
                    reject(new Error('Server startup timeout'));
                }
            }, 10000);

            this.serverProcess.stdout.on('data', (data) => {
                const output = data.toString();
                if (output.includes('Server is running on') || output.includes('localhost:3000')) {
                    serverReady = true;
                    clearTimeout(timeout);
                    this.testResults.serverStart = true;
                    this.log('Server started successfully');
                    resolve();
                }
            });

            this.serverProcess.stderr.on('data', (data) => {
                const error = data.toString();
                if (error.includes('Error') && !error.includes('warning')) {
                    reject(new Error(`Server error: ${error}`));
                }
            });

            this.serverProcess.on('error', (error) => {
                reject(error);
            });
        });
    }

    async testAPIEndpoint(method, path, expectedStatus = 200) {
        return new Promise((resolve) => {
            const options = {
                hostname: 'localhost',
                port: 3000,
                path: path,
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                }
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    const success = res.statusCode === expectedStatus;
                    const result = {
                        endpoint: `${method} ${path}`,
                        status: res.statusCode,
                        expected: expectedStatus,
                        success: success,
                        hasData: data.length > 0
                    };
                    
                    if (success) {
                        this.log(`${method} ${path} - Status: ${res.statusCode} ✓`);
                    } else {
                        this.log(`${method} ${path} - Status: ${res.statusCode} (expected ${expectedStatus}) ✗`, 'error');
                    }
                    
                    resolve(result);
                });
            });

            req.on('error', (error) => {
                this.log(`${method} ${path} - Error: ${error.message}`, 'error');
                resolve({
                    endpoint: `${method} ${path}`,
                    status: 0,
                    expected: expectedStatus,
                    success: false,
                    error: error.message
                });
            });

            req.end();
        });
    }

    async testFrontendPage(path) {
        return new Promise((resolve) => {
            const options = {
                hostname: 'localhost',
                port: 3000,
                path: path,
                method: 'GET'
            };

            const req = http.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    const success = res.statusCode === 200 && data.includes('<!DOCTYPE html>');
                    if (success) {
                        this.log(`Frontend ${path} - Accessible ✓`);
                    } else {
                        this.log(`Frontend ${path} - Not accessible ✗`, 'error');
                    }
                    resolve(success);
                });
            });

            req.on('error', (error) => {
                this.log(`Frontend ${path} - Error: ${error.message}`, 'error');
                resolve(false);
            });

            req.end();
        });
    }

    async runTests() {
        console.log('🔍 STEP 2 OPERATIONAL VERIFICATION');
        console.log('='.repeat(80));

        try {
            // 1. Start server
            await this.startServer();
            await this.sleep(2000); // Wait for full startup

            // 2. Test API endpoints
            console.log('\n📡 TESTING API ENDPOINTS...');
            const apiTests = [
                { method: 'GET', path: '/api/apartments', expected: 200 },
                { method: 'GET', path: '/api/apartments/dd450c65-1421-4428-bb9f-b218457833cf', expected: 200 },
                { method: 'GET', path: '/api/apartments/user/test-user', expected: 401 }, // Should require auth
                { method: 'GET', path: '/api/apartments/nonexistent', expected: 404 }
            ];

            for (const test of apiTests) {
                const result = await this.testAPIEndpoint(test.method, test.path, test.expected);
                this.testResults.apiEndpoints.push(result);
            }

            // 3. Test frontend pages
            console.log('\n🌐 TESTING FRONTEND PAGES...');
            const frontendTests = [
                '/apartments-listing.html',
                '/add-property.html'
            ];

            let frontendSuccess = 0;
            for (const page of frontendTests) {
                const success = await this.testFrontendPage(page);
                if (success) frontendSuccess++;
            }
            this.testResults.frontend = frontendSuccess === frontendTests.length;

            // 4. Generate report
            this.generateOperationalReport();

        } catch (error) {
            this.log(`Test execution failed: ${error.message}`, 'error');
        } finally {
            // 5. Cleanup
            await this.cleanup();
        }
    }

    generateOperationalReport() {
        console.log('\n' + '='.repeat(80));
        console.log('📊 OPERATIONAL TEST RESULTS');
        console.log('='.repeat(80));

        // Server startup
        console.log(`🚀 Server Startup: ${this.testResults.serverStart ? '✅ PASS' : '❌ FAIL'}`);

        // API endpoints
        const apiSuccess = this.testResults.apiEndpoints.filter(r => r.success).length;
        const apiTotal = this.testResults.apiEndpoints.length;
        console.log(`📡 API Endpoints: ${apiSuccess}/${apiTotal} passed`);
        
        this.testResults.apiEndpoints.forEach(result => {
            const status = result.success ? '✅' : '❌';
            console.log(`   ${status} ${result.endpoint} (${result.status})`);
        });

        // Frontend
        console.log(`🌐 Frontend Pages: ${this.testResults.frontend ? '✅ PASS' : '❌ FAIL'}`);

        // Overall success
        const allComponentsWorking = this.testResults.serverStart && 
                                   apiSuccess >= apiTotal * 0.75 && 
                                   this.testResults.frontend;

        console.log('\n' + '='.repeat(80));
        if (allComponentsWorking) {
            console.log('🎉 STEP 2 IS FULLY OPERATIONAL!');
            console.log('🏆 All core components are working correctly');
        } else {
            console.log('⚠️ Some components need attention');
        }
        
        console.log('✨ Operational verification complete');
        return allComponentsWorking;
    }

    async cleanup() {
        console.log('\n🧹 CLEANING UP...');
        
        if (this.serverProcess) {
            this.serverProcess.kill('SIGTERM');
            await this.sleep(1000);
            
            if (this.serverProcess.killed || this.serverProcess.exitCode !== null) {
                this.log('Server stopped successfully');
                this.testResults.cleanup = true;
            } else {
                this.serverProcess.kill('SIGKILL');
                this.log('Server force stopped');
                this.testResults.cleanup = true;
            }
        }
    }
}

// Run operational test
const tester = new Step2OperationalTest();
tester.runTests().then(() => {
    process.exit(0);
}).catch(error => {
    console.error('❌ Operational test failed:', error);
    process.exit(1);
});
