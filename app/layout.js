// app/layout.js
import './globals.css'
import { AuthProvider } from '@/contexts/auth-context'
import { DataProvider } from '@/contexts/data-context'
import { Toaster } from 'sonner'

export const metadata = {
  title: 'IGE - Tarefas e Lembretes',
  description: 'Sistema de gerenciamento de tarefas e lembretes',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
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
