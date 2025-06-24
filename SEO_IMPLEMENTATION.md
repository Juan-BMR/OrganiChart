# SEO and Link Preview Implementation

This document outlines the SEO and link preview enhancements implemented for OrganiChart.

## Overview

The implementation adds comprehensive SEO support and dynamic link previews for organization chart pages, showing the first 5 team members when links are shared on social media platforms.

## Key Features

### 1. Server-Side Rendering (SSR)
- Created `+page.server.js` for the organization chart route
- Fetches organization data and first 5 members server-side
- Provides SEO metadata even before client-side JavaScript loads

### 2. Dynamic Open Graph Images
- API endpoint at `/api/og-image/[id]` generates SVG images
- Shows organization name, logo, and first 5 member avatars
- Displays member count and "+X more" indicator for larger teams
- Fallback to default image when data unavailable

### 3. Meta Tags
- Dynamic Open Graph tags for Facebook/LinkedIn
- Twitter Card tags for Twitter previews
- Organization-specific titles and descriptions
- Member names included in description

### 4. Structured Data (JSON-LD)
- Schema.org Organization type
- Includes member information as Person types
- Helps search engines understand the content

### 5. SEO Infrastructure
- `sitemap.xml` generation with dynamic organization pages
- `robots.txt` file for crawler guidance
- Server hooks for security headers and caching
- Canonical URLs to prevent duplicate content

## Implementation Details

### File Structure
```
src/
├── routes/
│   ├── org/[id]/chart/
│   │   ├── +page.svelte (updated with SEO tags)
│   │   └── +page.server.js (new - SSR data loading)
│   ├── api/og-image/[id]/
│   │   └── +server.js (new - dynamic OG images)
│   └── sitemap.xml/
│       └── +server.js (new - sitemap generation)
├── hooks.server.js (new - server hooks)
├── app.html (updated with default meta tags)
└── lib/components/
    └── LinkPreviewCard.svelte (new - preview component)

static/
├── robots.txt (new)
└── og-image-default.png (placeholder)
```

### Environment Variables Required
```bash
# Firebase Admin SDK service account key (JSON string)
FIREBASE_SERVICE_ACCOUNT_KEY='{...}'
```

### Link Preview Display
When sharing organization chart links on social media:
1. Shows organization name and logo
2. Displays first 5 team members with avatars
3. Shows total member count
4. Includes OrganiChart branding

### Caching Strategy
- OG images: 1 hour cache
- Organization pages: 5 minutes cache
- Sitemap: 1 hour cache
- Static assets: Browser default

## Usage

### Sharing Links
Organization chart URLs can be shared directly:
```
https://organichart.com/org/[organization-id]/chart
```

### Testing SEO
1. Use Facebook's Sharing Debugger
2. Use Twitter Card Validator
3. Check Google's Rich Results Test
4. Verify sitemap at `/sitemap.xml`

## Future Enhancements

1. **Dynamic Image Generation**
   - Consider using a service like Cloudinary or Vercel OG
   - Generate PNG images instead of SVG for better compatibility

2. **Enhanced Previews**
   - Show organization hierarchy structure
   - Include department breakdown
   - Add recent activity indicators

3. **Performance**
   - Implement edge caching for OG images
   - Pre-render popular organization pages
   - Use CDN for static assets

4. **Analytics**
   - Track link sharing metrics
   - Monitor SEO performance
   - A/B test different preview formats

## Maintenance

- Update default OG image in `/static/og-image-default.png`
- Monitor Firebase Admin SDK initialization
- Keep structured data schema up to date
- Regular sitemap validation