// app/layout.js
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { AuthProvider } from '@/contexts/auth-context'
import { DataProvider } from '@/contexts/data-context'
import { Toaster } from 'sonner'

const _geist = Geist({ subsets: ['latin'] })
const _geistMono = Geist_Mono({ subsets: ['latin'] })

export const metadata = {
  title: 'IGE - Tarefas e Lembretes',
  description: 'Sistema de gerenciamento de tarefas e lembretes',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" className={_geist.className}>
      <body className="overflow-x-hidden bg-background text-foreground font-sans antialiased dark">
        <AuthProvider>
          <DataProvider>
            <Toaster />
            {children}
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  )
}