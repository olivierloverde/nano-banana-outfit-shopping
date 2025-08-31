'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Model } from '@/types'
import { OutfitModal } from './OutfitModal'

interface ModelCardProps {
  model: Model
}

export function ModelCard({ model }: ModelCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)

  const handleCardClick = () => {
    setIsModalOpen(true)
  }

  return (
    <>
      <div 
        className="group cursor-pointer bg-white rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-all duration-300"
        onClick={handleCardClick}
      >
        <div className="relative aspect-[3/4] bg-gray-100">
          {!imageLoaded && (
            <div className="absolute inset-0 skeleton rounded-t-lg" />
          )}
          
          <Image
            src={model.imageUrl}
            alt={model.name || 'Model outfit'}
            fill
            className={`object-cover transition-all duration-300 group-hover:scale-105 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            onLoad={() => setImageLoaded(true)}
            priority={false}
          />
          
          {/* Overlay with quick actions */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-4 left-4 right-4 flex justify-between items-center">
              <div className="flex space-x-2">
                <button className="p-2 bg-white/90 rounded-full shadow-sm hover:bg-white transition-colors">
                  <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </button>
                
                <button className="p-2 bg-white/90 rounded-full shadow-sm hover:bg-white transition-colors">
                  <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                  </svg>
                </button>
              </div>
              
              <button className="px-3 py-1.5 bg-gray-900/90 text-white text-sm font-medium rounded-full hover:bg-gray-900 transition-colors">
                Shop Look
              </button>
            </div>
          </div>
        </div>
        
        {model.name && (
          <div className="p-3">
            <h3 className="font-medium text-gray-900 truncate">
              {model.name}
            </h3>
          </div>
        )}
      </div>

      <OutfitModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        model={model}
      />
    </>
  )
}