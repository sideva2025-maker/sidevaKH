const SUPABASE_URL = 'https://jdzkallojiavqquksrbc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkemthbGxvamlhdnFxdWtzcmJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk5MzU1OTgsImV4cCI6MjA5NTUxMTU5OH0.iSQImX0lxF7PbXG17scvc7P5ApJxFbWJ1g-Re_qahtw';

addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.pathname === '/api/logout' && event.request.method === 'POST') {
    return event.respondWith(handleLogout(event.request));
  }
  return event.respondWith(fetch(event.request));
});

async function handleLogout(req) {
  const supabaseHeaders = new Headers({
    'apikey': SUPABASE_ANON_KEY,
    'Content-Type': 'application/json'
  });

  const cookie = req.headers.get('cookie');
  if (cookie) supabaseHeaders.set('Cookie', cookie);

  const auth = req.headers.get('Authorization');
  if (auth) supabaseHeaders.set('Authorization', auth);

  return fetch(`${SUPABASE_URL}/auth/v1/logout?scope=global`, {
    method: 'POST',
    headers: supabaseHeaders
  });
}
