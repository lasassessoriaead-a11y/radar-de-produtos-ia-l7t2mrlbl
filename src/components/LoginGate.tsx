import React, { useState } from 'react'
import { Radar, LogIn, UserPlus } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export default function LoginGate() {
  const { login, signup, isLoading } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      if (mode === 'signup') await signup(email.trim(), password, name.trim())
      else await login(email.trim(), password)
    } catch (err: any) {
      setError(err?.message || 'Não foi possível autenticar.')
    }
  }

  return (
    <div className="min-h-screen w-full bg-[#0A0B10] text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-[#242A3D] bg-[#11131C] p-6 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#00F2FF] to-[#7000FF] flex items-center justify-center">
            <Radar className="w-6 h-6 text-[#0A0B10]" />
          </div>
          <div>
            <h1 className="text-lg font-black">RADAR IA</h1>
            <p className="text-xs text-gray-400">Backend Supabase</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-5">
          <Button
            type="button"
            variant={mode === 'login' ? 'default' : 'outline'}
            onClick={() => setMode('login')}
            className="text-xs"
          >
            <LogIn className="w-4 h-4 mr-2" />
            Entrar
          </Button>
          <Button
            type="button"
            variant={mode === 'signup' ? 'default' : 'outline'}
            onClick={() => setMode('signup')}
            className="text-xs"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Criar acesso
          </Button>
        </div>

        <form onSubmit={submit} className="space-y-3">
          {mode === 'signup' && (
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              autoComplete="name"
            />
          )}
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Seu e-mail"
            type="email"
            autoComplete="email"
            required
          />
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            type="password"
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            minLength={6}
            required
          />
          {error && (
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
              {error}
            </div>
          )}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-[#00F2FF] to-[#7000FF] text-[#0A0B10] font-bold"
          >
            {isLoading ? 'Aguarde...' : mode === 'signup' ? 'Criar acesso' : 'Entrar'}
          </Button>
        </form>

        <p className="mt-4 text-[11px] leading-relaxed text-gray-500">
          Este acesso substitui o login interno do Skip. Seus dados ficam isolados por usuário via
          Row Level Security no Supabase.
        </p>
      </div>
    </div>
  )
}
