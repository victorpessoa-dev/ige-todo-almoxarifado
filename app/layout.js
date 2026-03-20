import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { AuthProvider } from '@/contexts/auth-context'
import { DataProvider } from '@/contexts/data-context'
import { Toaster } from 'sonner'

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata = {
  title: 'IGE - Tarefas e Lembretes',
  description: 'Sistema de gerenciamento de tarefas e lembretes',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased h-screen overflow-hidden">
        <AuthProvider>
          <DataProvider>
            {children}
            <Toaster position="top-right" />
          </DataProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}