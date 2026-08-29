/* Main App Component - Handles routing (using react-router-dom), query client and other providers */
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/context/AuthContext'
import Index from './pages/Index'
import RadarPage from './pages/Radar'
import HunterPage from './pages/Hunter'
import CampaignLabPage from './pages/CampaignLab'
import CampaignLibraryPage from './pages/CampaignLibrary'
import ImportPage from './pages/Import'
import AnalystPage from './pages/Analyst'
import SettingsPage from './pages/Settings'
import NotFound from './pages/NotFound'
import Layout from './components/Layout'

const App = () => (
  <BrowserRouter>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" richColors theme="dark" />
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Index />} />
            <Route path="/cacador" element={<HunterPage />} />
            <Route path="/radar" element={<RadarPage />} />
            <Route path="/laboratorio" element={<CampaignLabPage />} />
            <Route path="/campanhas" element={<CampaignLibraryPage />} />
            <Route path="/importar" element={<ImportPage />} />
            <Route path="/analista" element={<AnalystPage />} />
            <Route path="/configuracoes" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </TooltipProvider>
    </AuthProvider>
  </BrowserRouter>
)

export default App
