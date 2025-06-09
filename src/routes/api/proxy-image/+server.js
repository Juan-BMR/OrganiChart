export async function GET({ url }) {
  const imageUrl = url.searchParams.get('url');
  
  if (!imageUrl) {
    return new Response('Missing URL parameter', { status: 400 });
  }

  // Verify it's a Firebase Storage URL for security
  if (!imageUrl.includes('firebasestorage.googleapis.com')) {
    return new Response('Invalid URL - only Firebase Storage URLs allowed', { status: 400 });
  }

  try {
    // Fetch the image from Firebase Storage
    const response = await fetch(imageUrl);
    
    if (!response.ok) {
      return new Response('Failed to fetch image', { status: response.status });
    }

    // Get the image data
    const imageBuffer = await response.arrayBuffer();
    
    // Return the image with proper CORS headers
    return new Response(imageBuffer, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
      },
    });
  } catch (error) {
    console.error('Error proxying image:', error);
    return new Response('Internal server error', { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
} 