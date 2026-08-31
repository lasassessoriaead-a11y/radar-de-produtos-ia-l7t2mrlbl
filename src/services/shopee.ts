import pb from '@/lib/pocketbase/client'

const BASE_URL = import.meta.env.VITE_POCKETBASE_URL || ''
const STORAGE_KEY = 'radar_shopee_mode'

export type ShopeeConnectionStatus = {
  success: boolean
  marketplace: 'Shopee'
  mode: 'manual' | 'open_api'
  manual_enabled: boolean
  api_status: 'not_configured' | 'waiting_credentials' | 'configured' | 'error'
  app_id_masked?: string
  status_message: string
  last_tested_at?: string
  persisted?: boolean
  capabilities?: {
    manual_capabilities?: string[]
    api_capabilities_planned?: string[]
  }
}

const localStatus = (mode?: 'manual' | 'open_api'): ShopeeConnectionStatus => {
  const saved =
    mode ||
    (typeof window !== 'undefined'
      ? ((window.localStorage.getItem(STORAGE_KEY) as 'manual' | 'open_api' | null) || 'manual')
      : 'manual')

  return {
    success: true,
    marketplace: 'Shopee',
    mode: saved,
    manual_enabled: true,
    api_status: 'waiting_credentials',
    status_message:
      saved === 'manual'
        ? 'Modo Manual ativo: use Sub_id 1–5, gere o link na Shopee e importe o relatório de conversões no Radar.'
        : 'Open API selecionada, mas ainda não conectada. Aguardando AppId/Secret liberados pela Shopee. O modo Manual continua disponível.',
    persisted: false,
    capabilities: {
      manual_capabilities: [
        'advanced_sub_ids_1_5',
        'affiliate_link_registration',
        'csv_conversion_import',
        'deterministic_attribution_by_sub_id_5',
      ],
      api_capabilities_planned: [
        'product_discovery',
        'commission_sync',
        'affiliate_link_generation',
        'conversion_sync',
      ],
    },
  }
}

async function tryBackend(path: string, init?: RequestInit) {
  if (!BASE_URL) return null
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(init?.headers || {}),
        Authorization: pb.authStore.token,
      },
    })
    if (!res.ok) return null
    const raw = await res.text()
    if (!raw) return null
    try {
      return JSON.parse(raw)
    } catch {
      return null
    }
  } catch {
    return null
  }
}

export const shopeeService = {
  async getStatus(): Promise<ShopeeConnectionStatus> {
    const backend = await tryBackend('/backend/v1/marketplaces/shopee/status')
    if (backend?.success) {
      const mode = backend.mode === 'open_api' ? 'open_api' : 'manual'
      if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, mode)
      return backend
    }
    return localStatus()
  },

  async setMode(mode: 'manual' | 'open_api'): Promise<{
    success: boolean
    mode: 'manual' | 'open_api'
    manual_enabled: boolean
    api_status: string
    status_message: string
    persisted?: boolean
  }> {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, mode)
    }

    // IMPORTANT: Manual mode is intentionally frontend-only.
    // Do NOT call the Skip backend here, because some published runtimes
    // don't expose the optional Shopee settings route and return "File not found".
    if (mode === 'manual') {
      const fallback = localStatus('manual')
      return {
        success: true,
        mode: 'manual',
        manual_enabled: true,
        api_status: fallback.api_status,
        status_message: fallback.status_message,
        persisted: false,
      }
    }

    // Open API may use backend persistence in the future, if the route exists.
    const backend = await tryBackend('/backend/v1/marketplaces/shopee/mode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode }),
    })

    if (backend?.success) return backend

    const fallback = localStatus(mode)
    return {
      success: true,
      mode: fallback.mode,
      manual_enabled: true,
      api_status: fallback.api_status,
      status_message: fallback.status_message,
      persisted: false,
    }
  },
}
