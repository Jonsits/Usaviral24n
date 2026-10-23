// Cloudflare Worker: GitHub login for Decap CMS + serves the built site
async function auth(request, env) {
  const url = new URL(request.url);
  const state = crypto.randomUUID();
  const gh = new URL('https://github.com/login/oauth/authorize');
  gh.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  gh.searchParams.set('redirect_uri', url.origin + '/api/callback');
  gh.searchParams.set('scope', 'repo,user');
  gh.searchParams.set('state', state);
  return new Response(null, {
    status: 302,
    headers: {
      Location: gh.toString(),
      'Set-Cookie': `oauth_state=${state}; HttpOnly; Secure; Path=/; Max-Age=600; SameSite=Lax`,
    },
  });
}

async function callback(request, env) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const cookie = request.headers.get('Cookie') || '';
  const saved = (cookie.match(/oauth_state=([^;]+)/) || [])[1];
  if (!code || !state || state !== saved) return new Response('Invalid login state. Try again.', { status: 400 });
  const r = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code }),
  });
  const data = await r.json();
  const msg = data.access_token
    ? 'authorization:github:success:' + JSON.stringify({ token: data.access_token, provider: 'github' })
    : 'authorization:github:error:' + JSON.stringify(data);
  const html = `<!doctype html><script>
(function(){
  var msg = ${JSON.stringify(msg)};
  window.addEventListener('message', function(e){ window.opener.postMessage(msg, e.origin); window.close(); });
  window.opener.postMessage('authorizing:github', '*');
})();
</script>`;
  return new Response(html, { headers: { 'Content-Type': 'text/html' } });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/auth') return auth(request, env);
    if (pathname === '/api/callback') return callback(request, env);
    return env.ASSETS.fetch(request);
  },
};
