'use client'

import { useEffect } from 'react'
import { toast, Toaster } from 'sonner'

export function NotificationToaster() {
  useEffect(() => {
    const handleOffline = () => {
      toast.error('Sem conexão com a internet', {
        id: 'network-status',
        description: 'Algumas ações podem falhar até a conexão voltar.'
      })
    }

    const handleOnline = () => {
      toast.success('Conexão restabelecida', {
        id: 'network-status',
        description: 'Os dados podem ser atualizados normalmente.'
      })
    }

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)

    if (!navigator.onLine) {
      handleOffline()
    }

    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  return (
    <Toaster
      position="top-right"
      richColors
      expand
      visibleToasts={4}
      swipeDirections={['left', 'right']}
      toastOptions={{
        duration: 4200,
        dismissible: true,
        className: 'ige-toast'
      }}
    />
  )
}
