import { error } from '@sveltejs/kit';
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { COLLECTIONS } from '$lib/db/collections.js';

// Initialize Firebase Admin SDK
let app;
if (!getApps().length) {
  try {
    // Try to use service account credentials from environment
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountKey) {
      const serviceAccount = JSON.parse(serviceAccountKey);
      app = initializeApp({
        credential: cert(serviceAccount)
      });
    } else {
      // Fallback to default credentials (e.g., in Google Cloud environment)
      app = initializeApp();
    }
  } catch (err) {
    console.error('Failed to initialize Firebase Admin:', err);
    // Continue without admin SDK - client-side rendering will handle it
  }
}

export async function load({ params, url }) {
  const { id: organizationId } = params;
  
  // Default metadata for when Firebase Admin is not available
  const defaultMetadata = {
    organization: null,
    members: [],
    seo: {
      title: 'OrganiChart - Simple Organizational Charts',
      description: 'Create and manage organizational charts with ease. Simple, intuitive platform for visualizing company hierarchies.',
      imageUrl: '/og-image-default.png'
    }
  };

  // If Firebase Admin is not initialized, return default metadata
  if (!app) {
    return defaultMetadata;
  }

  try {
    const db = getFirestore(app);
    
    // Fetch organization data
    const orgDoc = await db.collection(COLLECTIONS.ORGANIZATIONS).doc(organizationId).get();
    
    if (!orgDoc.exists) {
      throw error(404, 'Organization not found');
    }
    
    const organization = {
      id: orgDoc.id,
      ...orgDoc.data()
    };
    
    // Fetch first 5 members for preview (prioritize by hierarchy)
    const membersSnapshot = await db
      .collection(COLLECTIONS.MEMBERS)
      .where('organizationId', '==', organizationId)
      .where('isActive', '==', true)
      .orderBy('level', 'asc')
      .orderBy('createdAt', 'asc')
      .limit(5)
      .get();
    
    const members = [];
    membersSnapshot.forEach(doc => {
      members.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    // Generate preview image URL (you might want to implement a dynamic image generation service)
    const baseUrl = url.origin;
    const previewImageUrl = `${baseUrl}/api/og-image/${organizationId}`;
    
    // Create SEO metadata
    const seo = {
      title: `${organization.name} - Organizational Chart | OrganiChart`,
      description: `View the organizational structure of ${organization.name}. ${members.length > 0 ? `Key members include ${members.slice(0, 3).map(m => m.name).join(', ')}${members.length > 3 ? ' and more' : ''}.` : 'Explore the team hierarchy and structure.'}`,
      imageUrl: organization.logoURL || previewImageUrl,
      memberCount: organization.memberCount || 0,
      organizationName: organization.name
    };
    
    return {
      organization,
      members,
      seo
    };
  } catch (err) {
    console.error('Error loading organization data:', err);
    
    // Return default metadata on error
    return defaultMetadata;
  }
}