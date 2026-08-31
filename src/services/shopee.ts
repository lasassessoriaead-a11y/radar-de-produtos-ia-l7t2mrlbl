import pb from '@/lib/pocketbase/client'

const BASE_URL = import.meta.env.VITE_POCKETBASE_URL || ''

export type ShopeeConnectionStatus = {
  success: boolean
  marketplace: 'Shopee'
  mode: 'manual' | 'open_api'
  manual_enabled: boolean
  api_status: 'not_configured' | 'waiting_credentials' | 'configured' | 'error'
  app_id_masked?: string
  status_message: string
  last_tested_at?: string
  capabilities?: {
    manual_capabilities?: string[]
    api_capabilities_planned?: string[]
  }
}

export const shopeeService = {
  async getStatus(): Promise<ShopeeConnectionStatus> {
    const res = await fetch(`${BASE_URL}/backend/v1/marketplaces/shopee/status`, {
      headers: { Authorization: pb.authStore.token },
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Falha ao carregar status da Shopee')
    return data
  },

  async setMode(mode: 'manual' | 'open_api'): Promise<{
    success: boolean
    mode: 'manual' | 'open_api'
    manual_enabled: boolean
    api_status: string
    status_message: string
  }> {
    const res = await fetch(`${BASE_URL}/backend/v1/marketplaces/shopee/mode`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: pb.authStore.token,
      },
      body: JSON.stringify({ mode }),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Falha ao alterar modo da Shopee')
    return data
  },
}
