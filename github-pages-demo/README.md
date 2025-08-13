# 🏠 SichrPlace Demo - GitHub Pages Deployment

[![Deploy to GitHub Pages](https://github.com/omer3kale/SichrPlace77/actions/workflows/deploy.yml/badge.svg)](https://github.com/omer3kale/SichrPlace77/actions/workflows/deploy.yml)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-blue)](https://omer3kale.github.io/SichrPlace77/)

**Live Demo**: [https://omer3kale.github.io/SichrPlace77/](https://omer3kale.github.io/SichrPlace77/)

This is a lightweight Next.js demo version of the SichrPlace apartment platform, optimized for GitHub Pages deployment. It showcases the core features and UI/UX of the full application.

## 🚀 Features Demonstrated

### 📱 **Modern UI/UX**
- Responsive design that works on all devices
- Clean, professional interface with Tailwind CSS
- Interactive apartment listings with filtering
- Progressive loading states and animations

### 🏠 **Apartment Showcase**
- Sample apartment listings from major German cities
- Advanced filtering by city and criteria
- Detailed apartment information cards
- Pricing and amenity displays

### 🔌 **Supabase Integration**
- Live connection to Supabase database
- Graceful fallback to demo data if offline
- Real-time data fetching with error handling
- TypeScript integration for type safety

### ⚡ **Performance Optimized**
- Static site generation for fast loading
- Optimized for GitHub Pages deployment
- Minimal bundle size with code splitting
- SEO-friendly with proper meta tags

## 🛠️ Tech Stack

**Frontend**: Next.js 15, React 18, TypeScript, Tailwind CSS  
**Backend**: Supabase (PostgreSQL database)  
**Deployment**: GitHub Pages with GitHub Actions  
**Build Tool**: Next.js with Static Export  

## 🚀 Quick Setup

### 1. Environment Configuration

Create `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
NEXT_PUBLIC_APP_NAME=SichrPlace Demo
NEXT_PUBLIC_DEMO_MODE=true
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the demo.

### 4. Build for Production

```bash
npm run build
```

This creates an optimized static export in the `out/` directory.

## 📋 GitHub Pages Deployment

### Automatic Deployment

This demo is configured for automatic deployment to GitHub Pages using GitHub Actions:

1. **Push to main branch** triggers automatic deployment
2. **GitHub Actions** builds the Next.js app with static export
3. **GitHub Pages** serves the static files from the `out/` directory

### Manual Setup Steps

1. **Fork or clone** this repository
2. **Enable GitHub Pages** in repository settings
3. **Set source** to "GitHub Actions"
4. **Add repository secrets**:
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_ANON_KEY`: Your Supabase anonymous key

### Repository Secrets Configuration

Go to **Settings > Secrets and Variables > Actions** and add:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## 🎯 Demo vs. Full Application

### What's Included in Demo:
- ✅ Apartment listing and filtering
- ✅ Responsive UI components
- ✅ Supabase database connection
- ✅ TypeScript integration
- ✅ Modern design system

### Full Application Features:
- 🔐 **User Authentication** - JWT-based login/registration
- 💬 **Real-time Chat** - Live messaging between users
- 📱 **PWA Capabilities** - Offline functionality, push notifications
- 🔒 **GDPR Compliance** - Advanced privacy controls
- 💳 **Payment Integration** - PayPal for secure transactions
- 📊 **Analytics Dashboard** - Real-time metrics and monitoring
- 🗺️ **Maps Integration** - Google Maps for property locations

## 🔗 Links

- **Full Application**: [SichrPlace Repository](https://github.com/omer3kale/SichrPlace77)
- **Documentation**: [Setup Guides](https://github.com/omer3kale/Setup-Guides-for-Mentally-Challanged)
- **Live Demo**: [GitHub Pages](https://omer3kale.github.io/SichrPlace77/)

## 📊 Performance Metrics

### Lighthouse Scores (Target):
- **Performance**: 95+
- **Accessibility**: 100
- **Best Practices**: 100
- **SEO**: 100

### Bundle Analysis:
- **First Load JS**: ~85kb gzipped
- **Total Page Size**: ~200kb
- **Time to Interactive**: <2s

## 🤝 Contributing

This demo is part of the larger SichrPlace project. To contribute:

1. Check the main [SichrPlace repository](https://github.com/omer3kale/SichrPlace77)
2. Read the [Contributing Guidelines](https://github.com/omer3kale/SichrPlace77/blob/main/CONTRIBUTING.md)
3. Submit issues or pull requests

## 📄 License

This project is part of SichrPlace and follows the same MIT License.

---

**Built with ❤️ for the student community in Germany**

[🌐 Live Demo](https://omer3kale.github.io/SichrPlace77/) • [📚 Documentation](https://github.com/omer3kale/Setup-Guides-for-Mentally-Challanged) • [🏠 Full App](https://github.com/omer3kale/SichrPlace77)
