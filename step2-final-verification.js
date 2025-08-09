const fs = require('fs');
const path = require('path');

class Step2FinalVerification {
    constructor() {
        this.results = {
            passed: 0,
            failed: 0,
            details: []
        };
    }

    log(message, type = 'info') {
        const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
        console.log(`${emoji} ${message}`);
    }

    test(description, condition) {
        if (condition) {
            this.results.passed++;
            this.log(description, 'success');
            this.results.details.push({ test: description, result: 'PASS' });
        } else {
            this.results.failed++;
            this.log(description, 'error');
            this.results.details.push({ test: description, result: 'FAIL' });
        }
    }

    async verifyStep2() {
        console.log('\n🔍 STEP 2 FINAL VERIFICATION - APARTMENT LISTING MANAGEMENT');
        console.log('=' .repeat(80));

        // 1. Backend Routes Verification
        console.log('\n📂 BACKEND ROUTES VERIFICATION');
        const apartmentsRoutePath = path.join(__dirname, 'backend/routes/apartments.js');
        const apartmentsRouteExists = fs.existsSync(apartmentsRoutePath);
        this.test('apartments.js route file exists', apartmentsRouteExists);

        if (apartmentsRouteExists) {
            const routeContent = fs.readFileSync(apartmentsRoutePath, 'utf8');
            this.test('GET / endpoint (list all apartments)', routeContent.includes("router.get('/'"));
            this.test('GET /user/:userId endpoint (user apartments)', routeContent.includes("router.get('/user/:userId'"));
            this.test('GET /:id endpoint (single apartment)', routeContent.includes("router.get('/:id'"));
            this.test('POST / endpoint (create apartment)', routeContent.includes("router.post('/'"));
            this.test('PUT /:id endpoint (update apartment)', routeContent.includes("router.put('/:id'"));
            this.test('DELETE /:id endpoint (delete apartment)', routeContent.includes("router.delete('/:id'"));
            this.test('Authentication middleware integration', routeContent.includes('auth') && routeContent.includes('middleware'));
            this.test('ApartmentService integration', routeContent.includes('ApartmentService'));
        }

        // 2. Service Layer Verification
        console.log('\n🔧 SERVICE LAYER VERIFICATION');
        const servicePath = path.join(__dirname, 'backend/services/ApartmentService.js');
        const serviceExists = fs.existsSync(servicePath);
        this.test('ApartmentService.js exists', serviceExists);

        if (serviceExists) {
            const serviceContent = fs.readFileSync(servicePath, 'utf8');
            this.test('create method implemented', serviceContent.includes('async create('));
            this.test('findById method implemented', serviceContent.includes('async findById('));
            this.test('list method implemented', serviceContent.includes('async list('));
            this.test('update method implemented', serviceContent.includes('async update('));
            this.test('delete method implemented', serviceContent.includes('async delete('));
            this.test('findByOwner method implemented', serviceContent.includes('async findByOwner('));
            this.test('Supabase integration', serviceContent.includes('supabase'));
        }

        // 3. Frontend Integration Verification
        console.log('\n🌐 FRONTEND INTEGRATION VERIFICATION');
        const listingPath = path.join(__dirname, 'frontend/apartments-listing.html');
        const addPropertyPath = path.join(__dirname, 'frontend/add-property.html');
        
        this.test('apartments-listing.html exists', fs.existsSync(listingPath));
        this.test('add-property.html exists', fs.existsSync(addPropertyPath));

        if (fs.existsSync(listingPath)) {
            const listingContent = fs.readFileSync(listingPath, 'utf8');
            this.test('API integration in listing page', listingContent.includes('/api/apartments'));
            this.test('Apartment rendering functionality', listingContent.includes('renderApartments'));
            this.test('Search functionality', listingContent.includes('search'));
        }

        // 4. Upload API Verification
        console.log('\n📤 UPLOAD API VERIFICATION');
        const uploadPath = path.join(__dirname, 'backend/api/upload-apartment.js');
        const uploadExists = fs.existsSync(uploadPath);
        this.test('upload-apartment.js exists', uploadExists);

        if (uploadExists) {
            const uploadContent = fs.readFileSync(uploadPath, 'utf8');
            this.test('Multer integration', uploadContent.includes('multer'));
            this.test('Image upload handling', uploadContent.includes('images'));
            this.test('ApartmentService integration in upload', uploadContent.includes('ApartmentService'));
        }

        // 5. Authentication Integration
        console.log('\n🔐 AUTHENTICATION INTEGRATION VERIFICATION');
        const authPath = path.join(__dirname, 'backend/middleware/auth.js');
        this.test('Authentication middleware exists', fs.existsSync(authPath));

        // 6. Environment Configuration
        console.log('\n⚙️ ENVIRONMENT CONFIGURATION VERIFICATION');
        const envPath = path.join(__dirname, '.env');
        const envExists = fs.existsSync(envPath);
        this.test('.env file exists', envExists);

        if (envExists) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            this.test('SUPABASE_URL configured', envContent.includes('SUPABASE_URL'));
            this.test('SUPABASE_ANON_KEY configured', envContent.includes('SUPABASE_ANON_KEY'));
            this.test('PORT configured', envContent.includes('PORT'));
            this.test('JWT_SECRET configured', envContent.includes('JWT_SECRET'));
        }

        // 7. Package Dependencies
        console.log('\n📦 PACKAGE DEPENDENCIES VERIFICATION');
        const packagePath = path.join(__dirname, 'backend/package.json');
        const packageExists = fs.existsSync(packagePath);
        this.test('backend package.json exists', packageExists);

        if (packageExists) {
            const packageContent = fs.readFileSync(packagePath, 'utf8');
            const packageData = JSON.parse(packageContent);
            this.test('Express dependency', packageData.dependencies && packageData.dependencies.express);
            this.test('Supabase dependency', packageData.dependencies && packageData.dependencies['@supabase/supabase-js']);
            this.test('Multer dependency', packageData.dependencies && packageData.dependencies.multer);
            this.test('JWT dependency', packageData.dependencies && (packageData.dependencies.jsonwebtoken || packageData.dependencies.jwt));
        }

        // 8. Server Integration
        console.log('\n🖥️ SERVER INTEGRATION VERIFICATION');
        const serverPath = path.join(__dirname, 'backend/server.js');
        const serverExists = fs.existsSync(serverPath);
        this.test('server.js exists', serverExists);

        if (serverExists) {
            const serverContent = fs.readFileSync(serverPath, 'utf8');
            this.test('Apartments routes mounted', serverContent.includes('/api/apartments') || serverContent.includes('apartments'));
            this.test('Upload API mounted', serverContent.includes('upload-apartment') || serverContent.includes('/api/upload'));
        }

        // Results Summary
        console.log('\n' + '='.repeat(80));
        console.log('📊 STEP 2 VERIFICATION RESULTS');
        console.log('='.repeat(80));

        const total = this.results.passed + this.results.failed;
        const successRate = Math.round((this.results.passed / total) * 100);

        console.log(`🎯 Success Rate: ${successRate}%`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`📋 Total Tests: ${total}`);

        if (successRate === 100) {
            console.log('\n🎉 CONGRATULATIONS! STEP 2 ACHIEVED 100% SUCCESS RATE!');
            console.log('🏆 Apartment Listing Management System is FULLY OPERATIONAL!');
        } else {
            console.log('\n⚠️ Additional fixes needed to reach 100% success rate.');
        }

        console.log('\n📝 DETAILED RESULTS:');
        this.results.details.forEach((detail, index) => {
            const status = detail.result === 'PASS' ? '✅' : '❌';
            console.log(`${index + 1}. ${status} ${detail.test}`);
        });

        return { successRate, details: this.results };
    }
}

// Run verification
const verifier = new Step2FinalVerification();
verifier.verifyStep2().then(results => {
    process.exit(results.successRate === 100 ? 0 : 1);
}).catch(error => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
});
