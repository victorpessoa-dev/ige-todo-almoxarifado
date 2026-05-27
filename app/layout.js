// app/layout.js
import './globals.css'
import { AuthProvider } from '@/contexts/auth-context'
import { DataProvider } from '@/contexts/data-context'
import { PwaRegister } from '@/components/pwa/PwaRegister'
import { Toaster } from 'sonner'

export const metadata = {
  title: 'IGE Almoxarifado',
  description: 'Sistema de solicitacoes, compras e almoxarifado',
  applicationName: 'IGE Almoxarifado',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'IGE'
  },
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }]
  }
}

export const viewport = {
  themeColor: '#020617',
  viewportFit: 'cover'
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="overflow-x-hidden bg-background text-foreground font-sans antialiased dark">
        <AuthProvider>
          <DataProvider>
            <PwaRegister />
            <Toaster />
            {children}
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
