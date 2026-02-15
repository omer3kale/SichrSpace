/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // Enable static site generation for GitHub Pages
  trailingSlash: true,
  images: {
    unoptimized: true  // Required for GitHub Pages
  },
  basePath: process.env.NODE_ENV === 'production' ? '/SichrPlace77' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/SichrPlace77/' : '',
  distDir: 'out'
}

module.exports = nextConfig
