export async function handle({ event, resolve }) {
  const response = await resolve(event, {
    // Enable server-side rendering for SEO
    ssr: true,
    
    // Prerender pages for better performance
    prerender: {
      default: false
    }
  });

  // Add security and caching headers
  const headers = response.headers;
  
  // Security headers
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'SAMEORIGIN');
  headers.set('X-XSS-Protection', '1; mode=block');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Set appropriate cache headers based on route
  if (event.url.pathname.startsWith('/api/og-image/')) {
    // Cache OG images for 1 hour
    headers.set('Cache-Control', 'public, max-age=3600');
  } else if (event.url.pathname.startsWith('/org/') && event.url.pathname.includes('/chart')) {
    // Cache organization pages for 5 minutes
    headers.set('Cache-Control', 'public, max-age=300, s-maxage=300');
  }

  return response;
}