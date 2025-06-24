import { error } from '@sveltejs/kit';
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

// Function to create SVG for the OG image
function createOGImageSVG(organization, members) {
  const width = 1200;
  const height = 630;
  const padding = 60;
  const avatarSize = 80;
  const avatarSpacing = 20;
  
  // Generate member avatars HTML
  let membersHTML = '';
  const maxMembers = Math.min(members.length, 5);
  const startX = padding;
  const startY = height - padding - avatarSize - 60;
  
  for (let i = 0; i < maxMembers; i++) {
    const member = members[i];
    const x = startX + (avatarSize + avatarSpacing) * i;
    
    if (member.photoURL) {
      // For actual photos, we'll use a placeholder circle since we can't embed external images in SVG easily
      membersHTML += `
        <circle cx="${x + avatarSize/2}" cy="${startY + avatarSize/2}" r="${avatarSize/2}" fill="#E5E7EB" stroke="#fff" stroke-width="3"/>
        <text x="${x + avatarSize/2}" y="${startY + avatarSize/2 + 6}" text-anchor="middle" font-size="28" font-weight="600" fill="#6B7280">${member.name.charAt(0).toUpperCase()}</text>
      `;
    } else {
      // Generate initials
      const initials = member.name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase();
      const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
      const bgColor = colors[i % colors.length];
      
      membersHTML += `
        <circle cx="${x + avatarSize/2}" cy="${startY + avatarSize/2}" r="${avatarSize/2}" fill="${bgColor}" stroke="#fff" stroke-width="3"/>
        <text x="${x + avatarSize/2}" y="${startY + avatarSize/2 + 6}" text-anchor="middle" font-size="28" font-weight="600" fill="white">${initials}</text>
      `;
    }
    
    // Add member name below avatar
    membersHTML += `
      <text x="${x + avatarSize/2}" y="${startY + avatarSize + 25}" text-anchor="middle" font-size="16" fill="#374151">${member.name}</text>
      <text x="${x + avatarSize/2}" y="${startY + avatarSize + 45}" text-anchor="middle" font-size="14" fill="#6B7280">${member.role || 'Team Member'}</text>
    `;
  }
  
  // Add "+X more" if there are more members
  if (organization.memberCount > 5) {
    const x = startX + (avatarSize + avatarSpacing) * maxMembers;
    membersHTML += `
      <circle cx="${x + avatarSize/2}" cy="${startY + avatarSize/2}" r="${avatarSize/2}" fill="#F3F4F6" stroke="#E5E7EB" stroke-width="3"/>
      <text x="${x + avatarSize/2}" y="${startY + avatarSize/2 + 6}" text-anchor="middle" font-size="20" font-weight="600" fill="#6B7280">+${organization.memberCount - 5}</text>
    `;
  }
  
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#F9FAFB;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#F3F4F6;stop-opacity:1" />
        </linearGradient>
      </defs>
      
      <!-- Background -->
      <rect width="${width}" height="${height}" fill="url(#bgGradient)"/>
      
      <!-- Top border accent -->
      <rect x="0" y="0" width="${width}" height="4" fill="#6366F1"/>
      
      <!-- Logo and brand -->
      <g transform="translate(${padding}, ${padding})">
        <!-- OrganiChart logo -->
        <circle cx="30" cy="30" r="30" fill="#6366F1"/>
        <path d="M30 15L15 23L30 31L45 23L30 15Z" fill="white" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M15 38L30 46L45 38" fill="none" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
        <path d="M15 30.5L30 38.5L45 30.5" fill="none" stroke="white" stroke-width="1.5" stroke-linejoin="round"/>
        
        <!-- Brand name -->
        <text x="75" y="40" font-size="28" font-weight="700" fill="#111827">OrganiChart</text>
      </g>
      
      <!-- Organization name -->
      <text x="${padding}" y="${height/2 - 40}" font-size="48" font-weight="700" fill="#111827">${organization.name}</text>
      <text x="${padding}" y="${height/2 + 10}" font-size="24" fill="#6B7280">Organizational Chart</text>
      
      <!-- Member count -->
      <text x="${padding}" y="${height/2 + 50}" font-size="20" fill="#4B5563">${organization.memberCount || 0} team members</text>
      
      <!-- Members preview -->
      ${membersHTML}
    </svg>
  `;
  
  return svg;
}

export async function GET({ params }) {
  const { id: organizationId } = params;
  
  if (!app) {
    // Return a default image if Firebase Admin is not initialized
    const defaultSVG = createOGImageSVG(
      { name: 'Organization', memberCount: 0 },
      []
    );
    
    return new Response(defaultSVG, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600'
      }
    });
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
    
    // Fetch first 5 members
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
    
    // Generate SVG
    const svg = createOGImageSVG(organization, members);
    
    return new Response(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      }
    });
  } catch (err) {
    console.error('Error generating OG image:', err);
    
    // Return a default error image
    const errorSVG = createOGImageSVG(
      { name: 'Organization', memberCount: 0 },
      []
    );
    
    return new Response(errorSVG, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=300' // Cache for 5 minutes on error
      }
    });
  }
}