// Cloudflare Pages Function: /api/callback  (GitHub login finish)
export async function onRequest({ request, env }) {
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
  const ok = !!data.access_token;
  const msg = ok
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
