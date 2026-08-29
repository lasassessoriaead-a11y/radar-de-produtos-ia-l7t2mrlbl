import React, { useState } from 'react'
import {
  Settings,
  Shield,
  Key,
  Database,
  Bot,
  Layers,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Globe,
  Radio,
  User,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { toast } from 'sonner'

export default function SettingsPage() {
  const { user, login } = useAuth()
  const [email, setEmail] = useState(user?.email || 'luka2510@hotmail.com')
  const [password, setPassword] = useState('Skip@Pass')
  const [saving, setSaving] = useState(false)

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await login(email, password)
      toast.success('Sessão autenticada com sucesso!')
    } catch (err) {
      console.error('Login error:', err)
      toast.error('Credenciais inválidas.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Page Header */}
      <div className="pb-4 border-b border-[#1E2232]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded bg-[#7000FF]/15 text-[#00F2FF] border border-[#7000FF]/30 font-bold">
            Configurações & Integrações
          </span>
          <span className="text-xs text-gray-400 font-mono">Fase 1 • Arquitetura Pronta</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-7 h-7 text-[#00F2FF]" />
          Configurações da Plataforma
        </h1>
        <p className="text-xs md:text-sm text-gray-400 mt-1 max-w-2xl leading-relaxed">
          Gerenciamento do usuário do sistema, estado dos modelos de IA nativos e status dos
          conectores futuros de marketplaces.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Account / Single-User Login */}
        <div className="p-6 rounded-2xl bg-[#141622] border border-[#232738] space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#212538]">
            <User className="w-5 h-5 text-[#00F2FF]" />
            <div>
              <h3 className="text-sm font-bold text-white">Conta do Usuário (Single-User)</h3>
              <p className="text-[11px] text-gray-400">Autenticação individual para a plataforma</p>
            </div>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300">E-mail Cadastrado</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#0D0F18] border border-[#292E44] text-xs text-white focus:outline-none focus:border-[#00F2FF]"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-300">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-[#0D0F18] border border-[#292E44] text-xs text-white focus:outline-none focus:border-[#00F2FF]"
              />
            </div>

            <Button
              type="submit"
              disabled={saving}
              className="w-full h-10 rounded-xl bg-[#00F2FF] hover:bg-[#00D8E6] text-[#0A0B10] font-bold text-xs"
            >
              {saving ? 'Validando...' : 'Reconectar / Atualizar Login'}
            </Button>
          </form>

          <div className="p-3 rounded-xl bg-[#0D0F18] border border-[#212538] text-[11px] text-gray-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#00E676] flex-shrink-0" />
            <span>
              Usuário ativo: <strong>{user?.email || 'luka2510@hotmail.com'}</strong>
            </span>
          </div>
        </div>

        {/* AI Agent Status */}
        <div className="p-6 rounded-2xl bg-[#141622] border border-[#232738] space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-[#212538]">
            <Bot className="w-5 h-5 text-[#7000FF]" />
            <div>
              <h3 className="text-sm font-bold text-white">Agente Nativo Skip Cloud</h3>
              <p className="text-[11px] text-gray-400">
                Inteligência contextual com ferramentas PB
              </p>
            </div>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-[#0D0F18] border border-[#212538] flex items-center justify-between">
              <span className="text-gray-400">Slug do Agente:</span>
              <span className="font-mono font-bold text-[#00F2FF]">analista-radar</span>
            </div>

            <div className="p-3 rounded-xl bg-[#0D0F18] border border-[#212538] flex items-center justify-between">
              <span className="text-gray-400">Modelo / Tier:</span>
              <span className="font-mono text-white">fast (baixa latência)</span>
            </div>

            <div className="p-3 rounded-xl bg-[#0D0F18] border border-[#212538] flex items-center justify-between">
              <span className="text-gray-400">Coleções Acessadas:</span>
              <span className="font-mono text-[#00E676]">
                products, discovered_products, ai_insights
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#0D0F18] border border-[#212538] flex items-center justify-between">
              <span className="text-gray-400">Status em Tempo Real:</span>
              <span className="inline-flex items-center gap-1.5 font-mono text-[#00E676] font-bold">
                <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse" />
                Operacional
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Telegram Channel Official Bot Configuration (Fase 5) */}
      <div className="p-6 rounded-2xl bg-[#141622] border border-[#232738] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#212538]">
          <div className="flex items-center gap-2.5">
            <Radio className="w-5 h-5 text-[#00F2FF]" />
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Conexão do Canal Oficial (Telegram Bot API)
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00F2FF]/20 text-[#00F2FF] border border-[#00F2FF]/40">
                  FASE 5 ATIVA
                </span>
              </h3>
              <p className="text-[11px] text-gray-400">
                Configure a chave de integração com a API oficial do Telegram para publicação direta
                e automática.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-[#0D0F18] border border-[#212538] space-y-2">
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-[#00E676]" />
              Instruções de Configuração Segura:
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-gray-300 text-[11px] leading-relaxed">
              <li>
                Abra o Telegram e inicie uma conversa com o <code>@BotFather</code>.
              </li>
              <li>
                Envie <code>/newbot</code> e siga as instruções para obter seu{' '}
                <strong>Bot Token</strong>.
              </li>
              <li>
                Adicione o bot como <strong>Administrador</strong> no seu Canal ou Grupo do
                Telegram.
              </li>
              <li>
                Configure o Token e Chat ID diretamente no modal de <strong>Publicação</strong> ou
                na Central.
              </li>
            </ol>
          </div>

          <div className="p-4 rounded-xl bg-[#0D0F18] border border-[#212538] space-y-2">
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-[#00F2FF]" />
              Proteção e Criptografia do Token:
            </h4>
            <p className="text-[11px] text-gray-300 leading-relaxed">
              O token nunca é exposto em texto plano na interface do usuário. No backend, ele é
              criptografado com padrão AES e armazenado de forma segura nas tabelas do Skip Cloud.
            </p>
          </div>
        </div>
      </div>

      {/* Mercado Livre API Token Configuration */}
      <div className="p-6 rounded-2xl bg-[#141622] border border-[#232738] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#212538]">
          <div className="flex items-center gap-2.5">
            <Key className="w-5 h-5 text-[#FFE600]" />
            <div>
              <h3 className="text-sm font-bold text-white">
                Conector da API do Mercado Livre (Site MLB)
              </h3>
              <p className="text-[11px] text-gray-400">
                Configure seu Access Token gratuito do Mercado Livre para buscas em tempo real
              </p>
            </div>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#00E676]/10 text-[#00E676] border border-[#00E676]/30 font-semibold">
            Conectado (Fase 2)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-[#0D0F18] border border-[#212538] space-y-2">
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-[#00F2FF]" />
              Como obter seu token gratuito do Mercado Livre:
            </h4>
            <ol className="list-decimal list-inside space-y-1 text-gray-300 text-[11px] leading-relaxed">
              <li>
                Acesse o portal de desenvolvedores do Mercado Livre
                (developers.mercadolibre.com.br).
              </li>
              <li>Crie uma aplicação gratuita para obter seu Client ID e Client Secret.</li>
              <li>Gere o Access Token temporário de teste para efetuar chamadas na API.</li>
              <li>Ou configure a variável de ambiente MERCADO_LIVRE_ACCESS_TOKEN no backend.</li>
            </ol>
          </div>

          <div className="p-4 rounded-xl bg-[#0D0F18] border border-[#212538] space-y-3">
            <h4 className="font-bold text-white flex items-center gap-1.5">
              <Database className="w-4 h-4 text-[#FFE600]" />
              Dados Fornecidos pelo Conector ML:
            </h4>
            <ul className="space-y-1 text-gray-300 text-[11px]">
              <li>
                <strong className="text-white">✓ Dados Reais:</strong> Título, Imagem, Preço, Preço
                Original, Quantidade de Vendas, Reputação/Avaliação, Vendedor, Link.
              </li>
              <li>
                <strong className="text-[#00F2FF]">✓ Calculado:</strong> Score de Oportunidade
                (0-100), Nível (Hot/Good/Test/Low).
              </li>
              <li>
                <strong className="text-[#C084FC]">✓ Estimado pela IA:</strong> Potencial de
                conversão, pontos fortes/fracos, público e ângulo.
              </li>
              <li>
                <strong className="text-gray-400">✕ Indisponível:</strong> Comissão de afiliado e
                link direto de afiliado (não fornecidos na API de catálogo do ML).
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Future Marketplace Integrations Status */}
      <div className="p-6 rounded-2xl bg-[#141622] border border-[#232738] space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#212538]">
          <div className="flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-[#00F2FF]" />
            <div>
              <h3 className="text-sm font-bold text-white">
                Arquitetura de Integrações com Marketplaces
              </h3>
              <p className="text-[11px] text-gray-400">
                Campos de origem (source) e metadados JSON prontos para conexão com APIs oficiais
              </p>
            </div>
          </div>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-[#00F2FF]/10 text-[#00F2FF] border border-[#00F2FF]/30 font-semibold">
            Fase 2 Ready
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              name: 'Shopee Affiliate API',
              desc: 'Importação automática de links, comissões em tempo real e tracking.',
              status: 'Arquitetura Pronta (Conexão na Fase 2)',
              badge: 'Preparado',
              color: 'text-[#FF5722]',
            },
            {
              name: 'Mercado Livre API',
              desc: 'Sincronização de catálogo, reputação do vendedor e ofertas relâmpago.',
              status: 'Arquitetura Pronta (Conexão na Fase 2)',
              badge: 'Preparado',
              color: 'text-[#FFE600]',
            },
            {
              name: 'Amazon Associates',
              desc: 'Coleta de ASINs, comissões por categoria e tracking IDs.',
              status: 'Arquitetura Pronta (Conexão na Fase 2)',
              badge: 'Preparado',
              color: 'text-[#FF9900]',
            },
            {
              name: 'TikTok Shop Partner',
              desc: 'Detecção de tendências virais e produtos com maior tração em lives.',
              status: 'Arquitetura Pronta (Conexão na Fase 2)',
              badge: 'Preparado',
              color: 'text-[#00F2FF]',
            },
          ].map((item, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-[#0D0F18] border border-[#232738] space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${item.color}`}>{item.name}</span>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-[#161924] text-gray-400 border border-[#2A2E44]">
                  {item.badge}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 leading-snug">{item.desc}</p>
              <div className="text-[10px] font-mono text-gray-500 pt-1 border-t border-[#1A1D2D]">
                {item.status}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
