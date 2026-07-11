'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, X } from 'lucide-react'

export function ImageGallery({ images, onRemove, analyzingIndex }) {
  if (images.length === 0) return null

  return (
    <Card>
      <CardContent className="p-3">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            Fotos adicionadas ({images.length})
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {images.map((image, index) => (
            <div key={index} className="relative aspect-square">
              {/* Local camera previews use data/blob URLs and do not benefit from next/image optimization. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={image}
                alt={`Foto ${index + 1}`}
                className="h-full w-full rounded-lg object-cover"
              />

              {analyzingIndex === index && (
                <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
                  <Loader2 className="h-6 w-6 animate-spin text-white" />
                </div>
              )}

              {analyzingIndex === null && (
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute -right-1 -top-1 h-6 w-6 rounded-full"
                  onClick={() => onRemove(index)}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
