import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { COLLECTIONS } from '$lib/db/collections.js';
import { FIREBASE_SERVICE_ACCOUNT_KEY } from '$env/static/private';

// Initialize Firebase Admin SDK
let app;
if (!getApps().length) {
  try {
    if (FIREBASE_SERVICE_ACCOUNT_KEY) {
      const serviceAccount = JSON.parse(FIREBASE_SERVICE_ACCOUNT_KEY);
      app = initializeApp({
        credential: cert(serviceAccount)
      });
    } else {
      app = initializeApp();
    }
  } catch (err) {
    console.error('Failed to initialize Firebase Admin:', err);
  }
}

export async function GET({ url }) {
  const baseUrl = url.origin;
  
  // Start with static pages
  const staticPages = [
    { url: '/', changefreq: 'daily', priority: 1.0 },
    { url: '/login', changefreq: 'monthly', priority: 0.8 },
    { url: '/dashboard', changefreq: 'weekly', priority: 0.9 }
  ];
  
  const pages = [...staticPages];
  
  // Add dynamic organization pages if Firebase Admin is available
  if (app) {
    try {
      const db = getFirestore(app);
      const orgsSnapshot = await db
        .collection(COLLECTIONS.ORGANIZATIONS)
        .where('isActive', '==', true)
        .orderBy('updatedAt', 'desc')
        .limit(100) // Limit to prevent huge sitemaps
        .get();
      
      orgsSnapshot.forEach(doc => {
        const org = doc.data();
        pages.push({
          url: `/org/${doc.id}/chart`,
          changefreq: 'weekly',
          priority: 0.7,
          lastmod: org.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
        });
      });
    } catch (err) {
      console.error('Error fetching organizations for sitemap:', err);
    }
  }
  
  // Generate XML
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
    ${page.lastmod ? `<lastmod>${page.lastmod}</lastmod>` : ''}
  </url>`).join('\n')}
</urlset>`;
  
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
    }
  });
}