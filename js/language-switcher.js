// 🌍 SichrPlace Language Switcher
// German/English language support

class LanguageSwitcher {
    constructor() {
        this.currentLanguage = localStorage.getItem('sichrplace-language') || 'en';
        this.translations = {};
        this.init();
    }

    async init() {
        await this.loadTranslations();
        this.createLanguageSwitcher();
        this.applyLanguage(this.currentLanguage);
    }

    async loadTranslations() {
        try {
            const response = await fetch('/js/translations.json');
            this.translations = await response.json();
        } catch (error) {
            console.warn('Could not load translations:', error);
            this.translations = this.getDefaultTranslations();
        }
    }

    createLanguageSwitcher() {
        const switcher = document.createElement('div');
        switcher.className = 'language-switcher';
        switcher.innerHTML = `
            <select id="language-select" class="form-select">
                <option value="en" ${this.currentLanguage === 'en' ? 'selected' : ''}>🇺🇸 English</option>
                <option value="de" ${this.currentLanguage === 'de' ? 'selected' : ''}>🇩🇪 Deutsch</option>
            </select>
        `;

        // Add to navigation
        const nav = document.querySelector('.navbar-nav') || document.querySelector('nav');
        if (nav) {
            nav.appendChild(switcher);
        }

        // Add event listener
        document.getElementById('language-select').addEventListener('change', (e) => {
            this.switchLanguage(e.target.value);
        });
    }

    switchLanguage(language) {
        this.currentLanguage = language;
        localStorage.setItem('sichrplace-language', language);
        this.applyLanguage(language);
    }

    applyLanguage(language) {
        const elements = document.querySelectorAll('[data-translate]');
        elements.forEach(element => {
            const key = element.getAttribute('data-translate');
            const translation = this.getTranslation(key, language);
            if (translation) {
                if (element.tagName === 'INPUT' && element.type !== 'submit') {
                    element.placeholder = translation;
                } else {
                    element.textContent = translation;
                }
            }
        });

        // Update document language attribute
        document.documentElement.lang = language;
    }

    getTranslation(key, language) {
        return this.translations[language]?.[key] || this.translations['en']?.[key] || key;
    }

    getDefaultTranslations() {
        return {
            en: {
                // Navigation
                'nav.home': 'Home',
                'nav.apartments': 'Apartments',
                'nav.about': 'About',
                'nav.contact': 'Contact',
                'nav.login': 'Login',
                'nav.register': 'Register',
                'nav.dashboard': 'Dashboard',

                // Homepage
                'hero.title': 'Find Your Perfect Home in Germany',
                'hero.subtitle': 'Discover amazing apartments with our smart matching system',
                'hero.search': 'Search apartments...',
                'hero.cta': 'Start Your Search',

                // Features
                'features.secure': 'Secure Payments',
                'features.verified': 'Verified Listings',
                'features.support': '24/7 Support',

                // Registration
                'register.title': 'SichrPlace',
                'register.subtitle': 'Join Germany\'s trusted rental platform',
                'register.tenant': 'I\'m looking for an apartment',
                'register.landlord': 'I want to list my property',
                'register.email': 'Email address',
                'register.password': 'Password',
                'register.confirm': 'Confirm password',
                'register.submit': 'Create Account',

                // Common
                'button.search': 'Search',
                'button.filter': 'Filter',
                'button.apply': 'Apply',
                'button.cancel': 'Cancel',
                'button.save': 'Save',
                'button.back': 'Back',
                'button.next': 'Next',
                'button.submit': 'Submit',

                // Footer
                'footer.about': 'About SichrPlace',
                'footer.contact': 'Contact Us',
                'footer.privacy': 'Privacy Policy',
                'footer.terms': 'Terms of Service',
                'footer.certified': 'German Certified Platform'
            },
            de: {
                // Navigation
                'nav.home': 'Startseite',
                'nav.apartments': 'Wohnungen',
                'nav.about': 'Über uns',
                'nav.contact': 'Kontakt',
                'nav.login': 'Anmelden',
                'nav.register': 'Registrieren',
                'nav.dashboard': 'Dashboard',

                // Homepage
                'hero.title': 'Finden Sie Ihr perfektes Zuhause in Deutschland',
                'hero.subtitle': 'Entdecken Sie fantastische Wohnungen mit unserem intelligenten Matching-System',
                'hero.search': 'Wohnungen suchen...',
                'hero.cta': 'Suche starten',

                // Features
                'features.secure': 'Sichere Zahlungen',
                'features.verified': 'Verifizierte Anzeigen',
                'features.support': '24/7 Support',

                // Registration
                'register.title': 'SichrPlace',
                'register.subtitle': 'Deutschlands vertrauenswürdige Mietplattform',
                'register.tenant': 'Ich suche eine Wohnung',
                'register.landlord': 'Ich möchte meine Immobilie vermieten',
                'register.email': 'E-Mail-Adresse',
                'register.password': 'Passwort',
                'register.confirm': 'Passwort bestätigen',
                'register.submit': 'Konto erstellen',

                // Common
                'button.search': 'Suchen',
                'button.filter': 'Filter',
                'button.apply': 'Anwenden',
                'button.cancel': 'Abbrechen',
                'button.save': 'Speichern',
                'button.back': 'Zurück',
                'button.next': 'Weiter',
                'button.submit': 'Absenden',

                // Footer
                'footer.about': 'Über SichrPlace',
                'footer.contact': 'Kontakt',
                'footer.privacy': 'Datenschutzerklärung',
                'footer.terms': 'Nutzungsbedingungen',
                'footer.certified': 'Deutsche zertifizierte Plattform'
            }
        };
    }
}

// Initialize language switcher when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LanguageSwitcher();
});

// Export for use in other modules
window.LanguageSwitcher = LanguageSwitcher;
