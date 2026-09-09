export function getSupabaseAdminConfig() {
  const url = String(process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').replace(
    /\/$/,
    '',
  )
  const key = String(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '')

  if (!url || !key) {
    throw new Error('Captura de leads ainda não configurada no servidor.')
  }

  return {
    url,
    headers: {
      apikey: key,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    } as Record<string, string>,
  }
}

export async function readJson(response: Response) {
  return await response.json().catch(() => null)
}

export function safeHttpUrl(value: unknown) {
  try {
    const parsed = new URL(String(value || ''))
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : ''
  } catch {
    return ''
  }
}
