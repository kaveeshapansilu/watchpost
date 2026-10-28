export function publicConnection(url = '', key = '') {
  if (!url && !key) return { configured: false, url: 'https://placeholder.supabase.co', key: 'placeholder-key' };
  if (!url || !key) throw new Error('Set both VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY, or leave both empty for setup.');
  const parsed = new URL(url);
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== '/') {
    throw new Error('VITE_SUPABASE_URL must be your HTTPS project origin.');
  }
  let isAnon = false;
  try { isAnon = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))).role === 'anon'; } catch { /* Publishable keys are not JWTs. */ }
  if (!key.startsWith('sb_publishable_') && !isAnon) {
    throw new Error('Use a Supabase publishable or anon key in the frontend. Secret/service-role keys must never be bundled.');
  }
  return { configured: true, url: parsed.origin, key };
}
