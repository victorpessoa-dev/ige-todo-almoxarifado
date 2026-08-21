'use client'

import { useEffect } from 'react'

const AudioPlayer = ({ soundId = 'new_notifcation' }) => {

  useEffect(() => {
    if (typeof window === 'undefined') return

    const notificationSound = new Audio(`/sound/${soundId}.mp3`)
    notificationSound.preload = 'auto'
    notificationSound.load()



    return () => {
      notificationSound.pause()
      notificationSound.currentTime = 0
    }
  }, [soundId])

  return null
}

export default AudioPlayer