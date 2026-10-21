/** Only public Supabase credentials belong in a distributable game. */
export function assertPublicSupabaseConfig(url: string, key: string): void {
  const parsed = new URL(url)
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error('Supabase URL must be HTTPS without credentials.')
  if (key.startsWith('sb_publishable_') && key.length >= 20) return
  try {
    const encoded = key.split('.')[1]
    if (!encoded) throw new Error()
    const payload = JSON.parse(atob(encoded.split('-').join('+').split('_').join('/'))) as { role?: string }
    if (payload.role === 'anon') return
  } catch { /* Invalid key stays rejected. */ }
  throw new Error('Use only a Supabase publishable/anon key. Never use a secret or service_role key.')
}
