/**
 * Cloudflare Worker Logout Proxy
 * 
 * Deploy this to your Cloudflare Worker to proxy logout requests
 * and bypass CORS blocking.
 * 
 * Setup:
 * 1. Go to Cloudflare Workers dashboard
 * 2. Create new Worker
 * 3. Paste this entire code
 * 4. Replace SUPABASE_URL and SUPABASE_ANON_KEY with your values
 * 5. Add route: yoursite.com/api/logout*
 * 6. Deploy
 */

// Replace these with your Supabase credentials
const SUPABASE_URL = 'https://jdzkallojiavqquksrbc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkemthbGxvamlhdnFxdWtzcmJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MzU1OTgsImV4cCI6MjA5NTUxMTU5OH0.iSQImX0lxF7PbXG17scvc7P5ApJxFbWJ1g-Re_qahtw';

addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Handle /api/logout POST requests
  if (url.pathname === '/api/logout' && event.request.method === 'POST') {
    return event.respondWith(handleLogout(event.request));
  }
  
  // Pass through other requests
  return event.respondWith(fetch(event.request));
});

async function handleLogout(req) {
  try {
    // Extract cookies from client request to forward to Supabase
    const clientCookies = req.headers.get('cookie') || '';
    
    // Build headers for Supabase request
    const supabaseHeaders = new Headers({
      'apikey': SUPABASE_ANON_KEY,
      'Content-Type': 'application/json',
    });
    
    // Forward cookies if present (includes session/refresh token cookies)
    if (clientCookies) {
      supabaseHeaders.set('Cookie', clientCookies);
    }
    
    // Forward Authorization header if present (JS can attach Bearer token)
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      supabaseHeaders.set('Authorization', authHeader);
    }
    
    console.log('[Worker] Forwarding logout to Supabase', {
      url: `${SUPABASE_URL}/auth/v1/logout?scope=global`,
      headers: Object.fromEntries(supabaseHeaders),
    });
    
    // Forward logout request to Supabase
    const supabaseRes = await fetch(`${SUPABASE_URL}/auth/v1/logout?scope=global`, {
      method: 'POST',
      headers: supabaseHeaders,
      // Supabase will respond with Set-Cookie headers to clear auth tokens
    });
    
    console.log('[Worker] Supabase logout response:', {
      status: supabaseRes.status,
      statusText: supabaseRes.statusText,
      setCookie: supabaseRes.headers.get('Set-Cookie'),
    });
    
    // Copy response headers to client, especially Set-Cookie to clear tokens
    const responseHeaders = new Headers(supabaseRes.headers);
    
    // Ensure we pass back Supabase's Set-Cookie headers to clear client cookies
    // Supabase will send headers like: 
    //   Set-Cookie: sb-XXX=deleted; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None
    const setCookieHeaders = supabaseRes.headers.getSetCookie?.() || [];
    if (setCookieHeaders.length > 0) {
      responseHeaders.delete('Set-Cookie'); // Clear if exists
      setCookieHeaders.forEach(cookie => {
        responseHeaders.append('Set-Cookie', cookie);
      });
      console.log('[Worker] Set-Cookie headers from Supabase:', setCookieHeaders);
    }
    
    // Return response with Supabase headers intact
    const body = await supabaseRes.text();
    return new Response(body, {
      status: supabaseRes.status,
      statusText: supabaseRes.statusText,
      headers: responseHeaders,
    });
    
  } catch (error) {
    console.error('[Worker] Logout proxy error:', error);
    return new Response(JSON.stringify({ error: 'Logout failed: ' + error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
