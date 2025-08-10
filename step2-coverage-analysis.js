const fs = require('fs');
const path = require('path');

class Step2CodeCoverageAnalyzer {
    constructor() {
        this.coverage = {
            routes: {
                total: 0,
                covered: 0,
                details: []
            },
            services: {
                total: 0,
                covered: 0,
                details: []
            },
            frontend: {
                total: 0,
                covered: 0,
                details: []
            },
            apis: {
                total: 0,
                covered: 0,
                details: []
            },
            middleware: {
                total: 0,
                covered: 0,
                details: []
            },
            config: {
                total: 0,
                covered: 0,
                details: []
            }
        };
    }

    log(message, type = 'info') {
        const emoji = type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`${emoji} ${message}`);
    }

    analyzeFile(filePath, expectedFeatures) {
        if (!fs.existsSync(filePath)) {
            return { exists: false, coverage: 0, features: [] };
        }

        const content = fs.readFileSync(filePath, 'utf8');
        const foundFeatures = [];
        let coverageScore = 0;

        expectedFeatures.forEach(feature => {
            if (content.includes(feature.pattern)) {
                foundFeatures.push(feature.name);
                coverageScore += feature.weight || 1;
            }
        });

        const maxScore = expectedFeatures.reduce((sum, f) => sum + (f.weight || 1), 0);
        const coveragePercent = Math.round((coverageScore / maxScore) * 100);

        return {
            exists: true,
            coverage: coveragePercent,
            features: foundFeatures,
            totalFeatures: expectedFeatures.length,
            foundCount: foundFeatures.length
        };
    }

    analyzeRoutes() {
        console.log('\n🛣️ ROUTES COVERAGE ANALYSIS');
        console.log('=' .repeat(50));

        const routesPath = path.join(__dirname, 'backend/routes/apartments.js');
        const expectedFeatures = [
            { name: 'GET / (list all)', pattern: "router.get('/'", weight: 2 },
            { name: 'GET /user/:userId', pattern: "router.get('/user/:userId'", weight: 2 },
            { name: 'GET /:id (single)', pattern: "router.get('/:id'", weight: 2 },
            { name: 'POST / (create)', pattern: "router.post('/'", weight: 3 },
            { name: 'PUT /:id (update)', pattern: "router.put('/:id'", weight: 3 },
            { name: 'DELETE /:id (remove)', pattern: "router.delete('/:id'", weight: 3 },
            { name: 'Auth middleware', pattern: 'auth', weight: 2 },
            { name: 'Error handling', pattern: 'catch', weight: 1 },
            { name: 'Response formatting', pattern: 'res.json', weight: 1 },
            { name: 'Service integration', pattern: 'ApartmentService', weight: 2 }
        ];

        const analysis = this.analyzeFile(routesPath, expectedFeatures);
        this.coverage.routes.total = expectedFeatures.length;
        this.coverage.routes.covered = analysis.foundCount;
        this.coverage.routes.details = analysis;

        this.log(`Routes file exists: ${analysis.exists}`);
        this.log(`Features found: ${analysis.foundCount}/${analysis.totalFeatures}`);
        this.log(`Coverage score: ${analysis.coverage}%`);
        
        if (analysis.features.length > 0) {
            console.log('   Implemented features:', analysis.features.join(', '));
        }
    }

    analyzeServices() {
        console.log('\n🔧 SERVICES COVERAGE ANALYSIS');
        console.log('=' .repeat(50));

        const servicePath = path.join(__dirname, 'backend/services/ApartmentService.js');
        const expectedFeatures = [
            { name: 'create method', pattern: 'async create(', weight: 3 },
            { name: 'findById method', pattern: 'async findById(', weight: 2 },
            { name: 'list method', pattern: 'async list(', weight: 2 },
            { name: 'update method', pattern: 'async update(', weight: 3 },
            { name: 'delete method', pattern: 'async delete(', weight: 3 },
            { name: 'findByOwner method', pattern: 'async findByOwner(', weight: 2 },
            { name: 'Supabase client', pattern: 'supabase', weight: 2 },
            { name: 'Error handling', pattern: 'try', weight: 1 },
            { name: 'SQL queries', pattern: 'select', weight: 1 },
            { name: 'Insert operations', pattern: 'insert', weight: 1 }
        ];

        const analysis = this.analyzeFile(servicePath, expectedFeatures);
        this.coverage.services.total = expectedFeatures.length;
        this.coverage.services.covered = analysis.foundCount;
        this.coverage.services.details = analysis;

        this.log(`Service file exists: ${analysis.exists}`);
        this.log(`Features found: ${analysis.foundCount}/${analysis.totalFeatures}`);
        this.log(`Coverage score: ${analysis.coverage}%`);
    }

    analyzeFrontend() {
        console.log('\n🌐 FRONTEND COVERAGE ANALYSIS');
        console.log('=' .repeat(50));

        // Analyze apartments listing page
        const listingPath = path.join(__dirname, 'frontend/apartments-listing.html');
        const listingFeatures = [
            { name: 'API fetch calls', pattern: '/api/apartments', weight: 3 },
            { name: 'Apartment rendering', pattern: 'renderApartments', weight: 3 },
            { name: 'Search functionality', pattern: 'search', weight: 2 },
            { name: 'Filter functionality', pattern: 'filter', weight: 2 },
            { name: 'Responsive design', pattern: 'media', weight: 1 },
            { name: 'Loading states', pattern: 'loading', weight: 1 }
        ];

        const listingAnalysis = this.analyzeFile(listingPath, listingFeatures);
        
        // Analyze add property page
        const addPropertyPath = path.join(__dirname, 'frontend/add-property.html');
        const addPropertyFeatures = [
            { name: 'Form submission', pattern: 'submit', weight: 3 },
            { name: 'API integration', pattern: '/api/', weight: 3 },
            { name: 'File upload', pattern: 'file', weight: 2 },
            { name: 'Form validation', pattern: 'required', weight: 2 },
            { name: 'Success feedback', pattern: 'success', weight: 1 }
        ];

        const addPropertyAnalysis = this.analyzeFile(addPropertyPath, addPropertyFeatures);

        this.coverage.frontend.total = listingFeatures.length + addPropertyFeatures.length;
        this.coverage.frontend.covered = listingAnalysis.foundCount + addPropertyAnalysis.foundCount;
        
        this.log(`Listing page: ${listingAnalysis.foundCount}/${listingFeatures.length} features`);
        this.log(`Add property page: ${addPropertyAnalysis.foundCount}/${addPropertyFeatures.length} features`);
        
        const frontendCoverage = Math.round((this.coverage.frontend.covered / this.coverage.frontend.total) * 100);
        this.log(`Overall frontend coverage: ${frontendCoverage}%`);
    }

    analyzeAPIs() {
        console.log('\n📤 API COVERAGE ANALYSIS');
        console.log('=' .repeat(50));

        const uploadApiPath = path.join(__dirname, 'backend/api/upload-apartment.js');
        const expectedFeatures = [
            { name: 'Multer configuration', pattern: 'multer', weight: 3 },
            { name: 'File handling', pattern: 'file', weight: 2 },
            { name: 'Service integration', pattern: 'Service', weight: 2 },
            { name: 'Error handling', pattern: 'catch', weight: 1 },
            { name: 'Response formatting', pattern: 'res.json', weight: 1 }
        ];

        const analysis = this.analyzeFile(uploadApiPath, expectedFeatures);
        this.coverage.apis.total = expectedFeatures.length;
        this.coverage.apis.covered = analysis.foundCount;
        this.coverage.apis.details = analysis;

        this.log(`Upload API exists: ${analysis.exists}`);
        this.log(`Features found: ${analysis.foundCount}/${analysis.totalFeatures}`);
        this.log(`Coverage score: ${analysis.coverage}%`);
    }

    analyzeMiddleware() {
        console.log('\n🔐 MIDDLEWARE COVERAGE ANALYSIS');
        console.log('=' .repeat(50));

        const authPath = path.join(__dirname, 'backend/middleware/auth.js');
        const expectedFeatures = [
            { name: 'JWT verification', pattern: 'jwt', weight: 3 },
            { name: 'Token extraction', pattern: 'token', weight: 2 },
            { name: 'User authentication', pattern: 'auth', weight: 2 },
            { name: 'Error handling', pattern: 'catch', weight: 1 },
            { name: 'Next middleware', pattern: 'next()', weight: 1 }
        ];

        const analysis = this.analyzeFile(authPath, expectedFeatures);
        this.coverage.middleware.total = expectedFeatures.length;
        this.coverage.middleware.covered = analysis.foundCount;

        this.log(`Auth middleware exists: ${analysis.exists}`);
        this.log(`Features found: ${analysis.foundCount}/${analysis.totalFeatures}`);
        this.log(`Coverage score: ${analysis.coverage}%`);
    }

    analyzeConfiguration() {
        console.log('\n⚙️ CONFIGURATION COVERAGE ANALYSIS');
        console.log('=' .repeat(50));

        // Check environment variables
        const envPath = path.join(__dirname, '.env');
        const requiredEnvVars = [
            'SUPABASE_URL',
            'SUPABASE_ANON_KEY', 
            'JWT_SECRET',
            'PORT'
        ];

        let envCoverage = 0;
        if (fs.existsSync(envPath)) {
            const envContent = fs.readFileSync(envPath, 'utf8');
            const foundVars = requiredEnvVars.filter(varName => envContent.includes(varName));
            envCoverage = Math.round((foundVars.length / requiredEnvVars.length) * 100);
            this.log(`Environment variables: ${foundVars.length}/${requiredEnvVars.length} (${envCoverage}%)`);
        }

        // Check package.json dependencies
        const packagePath = path.join(__dirname, 'backend/package.json');
        const requiredDeps = ['express', '@supabase/supabase-js', 'multer', 'jsonwebtoken'];
        
        let depCoverage = 0;
        if (fs.existsSync(packagePath)) {
            const packageContent = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            const deps = { ...packageContent.dependencies, ...packageContent.devDependencies };
            const foundDeps = requiredDeps.filter(dep => deps[dep] || deps['jwt']);
            depCoverage = Math.round((foundDeps.length / requiredDeps.length) * 100);
            this.log(`Dependencies: ${foundDeps.length}/${requiredDeps.length} (${depCoverage}%)`);
        }

        this.coverage.config.total = 2;
        this.coverage.config.covered = (envCoverage === 100 ? 1 : 0) + (depCoverage >= 75 ? 1 : 0);
    }

    generateReport() {
        console.log('\n' + '='.repeat(80));
        console.log('📊 STEP 2 CODE COVERAGE REPORT');
        console.log('='.repeat(80));

        const totalComponents = Object.keys(this.coverage).length;
        let overallScore = 0;
        let componentScores = [];

        Object.entries(this.coverage).forEach(([component, data]) => {
            const score = data.total > 0 ? Math.round((data.covered / data.total) * 100) : 100;
            componentScores.push(score);
            overallScore += score;
            
            const status = score >= 90 ? '🟢' : score >= 70 ? '🟡' : '🔴';
            console.log(`${status} ${component.toUpperCase()}: ${score}% (${data.covered}/${data.total})`);
        });

        const finalScore = Math.round(overallScore / totalComponents);
        console.log('\n' + '='.repeat(80));
        console.log(`🎯 OVERALL COVERAGE SCORE: ${finalScore}%`);
        
        if (finalScore >= 95) {
            console.log('🏆 EXCELLENT! Step 2 has comprehensive coverage!');
        } else if (finalScore >= 85) {
            console.log('✅ GOOD! Step 2 has solid coverage!');
        } else if (finalScore >= 70) {
            console.log('⚠️ FAIR. Some areas need improvement.');
        } else {
            console.log('❌ NEEDS WORK. Significant gaps in coverage.');
        }

        console.log('\n📋 COVERAGE BREAKDOWN:');
        console.log(`• Routes & Endpoints: ${componentScores[0]}%`);
        console.log(`• Service Layer: ${componentScores[1]}%`); 
        console.log(`• Frontend Integration: ${componentScores[2]}%`);
        console.log(`• API Endpoints: ${componentScores[3]}%`);
        console.log(`• Middleware: ${componentScores[4]}%`);
        console.log(`• Configuration: ${componentScores[5]}%`);

        return { finalScore, componentScores };
    }

    async runAnalysis() {
        console.log('🔍 STARTING STEP 2 CODE COVERAGE ANALYSIS');
        console.log('Analyzing apartment listing management system implementation...\n');

        this.analyzeRoutes();
        this.analyzeServices();
        this.analyzeFrontend();
        this.analyzeAPIs();
        this.analyzeMiddleware();
        this.analyzeConfiguration();

        const report = this.generateReport();
        
        console.log('\n✨ Analysis complete!');
        return report;
    }
}

// Run the analysis
const analyzer = new Step2CodeCoverageAnalyzer();
analyzer.runAnalysis().then(report => {
    process.exit(report.finalScore >= 90 ? 0 : 1);
}).catch(error => {
    console.error('❌ Analysis failed:', error);
    process.exit(1);
});
