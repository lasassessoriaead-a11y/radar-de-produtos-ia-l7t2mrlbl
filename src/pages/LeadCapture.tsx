import React, { useMemo, useState } from 'react'
import { CheckCircle2, Gift, ShieldCheck, Sparkles, Tag, Mail, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LeadCapturePage() {
  const params = useMemo(() => new URLSearchParams(window.location.search), [])
  const [form, setForm] = useState({
    name: '',
    identifier: '',
    product_interest: params.get('produto') || '',
    category: params.get('categoria') || '',
    declared_intent: 'Quero receber ofertas e conteúdos relacionados',
    consent_accepted: false,
    company_website: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [message, setMessage] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    if (!form.consent_accepted) {
      setMessage('Marque o consentimento para continuar.')
      return
    }

    setSubmitting(true)
    try {
      const base = import.meta.env.VITE_POCKETBASE_URL || ''
      const res = await fetch(`${base}/backend/v1/public/leads/capture`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          channel: 'landing_page',
          campaign_id: params.get('campanha') || '',
          product_id: params.get('produto_id') || '',
          origin_source: window.location.href,
          authorized_purpose:
            'Receber ofertas, novidades e conteúdos relacionados aos interesses informados',
          consent_text_version: 'v1.0-public-capture',
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.success === false) {
        throw new Error(data.error || data.message || 'Não foi possível concluir o cadastro.')
      }
      setSuccess(true)
      setMessage(data.message || 'Cadastro realizado com sucesso.')
    } catch (err: any) {
      setMessage(err.message || 'Não foi possível concluir o cadastro.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-[#090B12] text-white">
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-12 lg:grid-cols-2 lg:px-8">
        <section className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-300">
            <Sparkles className="h-3.5 w-3.5" />
            Radar de Produtos IA
          </div>
          <h1 className="text-4xl font-black leading-tight sm:text-5xl">
            Receba ofertas que façam sentido para você.
          </h1>
          <p className="max-w-xl text-base leading-7 text-slate-300">
            Informe o que você procura e receba apenas conteúdos e oportunidades relacionados ao seu interesse.
            Sem listas compradas e sem contato sem permissão.
          </p>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <Tag className="mb-3 h-5 w-5 text-cyan-300" />
              <p className="text-sm font-bold">Ofertas relevantes</p>
              <p className="mt-1 text-xs text-slate-400">Baseadas no interesse que você informar.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <ShieldCheck className="mb-3 h-5 w-5 text-emerald-300" />
              <p className="text-sm font-bold">Consentimento claro</p>
              <p className="mt-1 text-xs text-slate-400">Você escolhe se quer receber novidades.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <Gift className="mb-3 h-5 w-5 text-violet-300" />
              <p className="text-sm font-bold">Descobertas úteis</p>
              <p className="mt-1 text-xs text-slate-400">Produtos, promoções e conteúdos relacionados.</p>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#111522] p-6 shadow-2xl sm:p-8">
          {success ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
              <CheckCircle2 className="mb-5 h-14 w-14 text-emerald-400" />
              <h2 className="text-2xl font-black">Cadastro realizado</h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-slate-300">{message}</p>
              <p className="mt-5 text-xs text-slate-500">
                Você poderá revogar seu consentimento a qualquer momento pelos canais disponibilizados.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <h2 className="text-2xl font-black">Quero receber oportunidades</h2>
                <p className="mt-2 text-sm text-slate-400">
                  Preencha somente o necessário. Nome é opcional.
                </p>
              </div>

              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-300">Nome (opcional)</label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Como podemos chamar você?"
                    className="border-white/10 bg-black/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                    Seu contato
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <Input
                      required
                      value={form.identifier}
                      onChange={(e) => setForm({ ...form, identifier: e.target.value })}
                      placeholder="E-mail, @Telegram ou WhatsApp informado por você"
                      className="border-white/10 bg-black/20 pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                    O que você está procurando?
                  </label>
                  <Input
                    value={form.product_interest}
                    onChange={(e) => setForm({ ...form, product_interest: e.target.value })}
                    placeholder="Ex.: aspirador portátil, organização, eletrônicos..."
                    className="border-white/10 bg-black/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-300">Categoria (opcional)</label>
                  <Input
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    placeholder="Ex.: Casa, Beleza, Eletrônicos"
                    className="border-white/10 bg-black/20"
                  />
                </div>

                <input
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="hidden"
                  value={form.company_website}
                  onChange={(e) => setForm({ ...form, company_website: e.target.value })}
                />

                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
                  <input
                    type="checkbox"
                    checked={form.consent_accepted}
                    onChange={(e) => setForm({ ...form, consent_accepted: e.target.checked })}
                    className="mt-1 h-4 w-4"
                  />
                  <span className="text-xs leading-5 text-slate-300">
                    Autorizo o uso deste contato para receber ofertas, novidades e conteúdos relacionados aos
                    interesses que informei. Sei que posso revogar essa autorização futuramente.
                  </span>
                </label>

                {message && !success && (
                  <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-xs text-amber-200">
                    {message}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={submitting}
                  className="h-12 w-full bg-gradient-to-r from-cyan-400 to-violet-500 font-black text-slate-950 hover:opacity-90"
                >
                  {submitting ? 'Registrando...' : (
                    <span className="flex items-center gap-2">
                      Quero receber oportunidades <Send className="h-4 w-4" />
                    </span>
                  )}
                </Button>

                <p className="text-center text-[11px] leading-4 text-slate-500">
                  Seus dados não são coletados de redes sociais e não são adicionados sem sua ação voluntária.
                </p>
              </form>
            </>
          )}
        </section>
      </div>
    </main>
  )
}
