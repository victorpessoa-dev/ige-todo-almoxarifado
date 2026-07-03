// app/layout.js
import './globals.css'
import { AuthProvider } from '@/contexts/auth-context'
import { PwaRegister } from '@/components/pwa/PwaRegister'
import { NotificationToaster } from '@/components/notifications/NotificationToaster'

export const metadata = {
  title: 'IGE Almoxarifado',
  description: 'Sistema de solicitacoes de compras e almoxarifado',
  applicationName: 'IGE Almoxarifado',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'IGE'
  },
  icons: {
    icon: [
      { url: '/ige-supergesso.svg', sizes: 'any', type: 'image/svg+xml' }
    ],
    apple: [{ url: '/ige-supergesso.svg', sizes: 'any', type: 'image/svg+xml' }]
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
          <PwaRegister />
          <NotificationToaster />
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
