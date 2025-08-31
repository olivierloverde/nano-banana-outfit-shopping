'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { Model, Outfit, OutfitPiece } from '@/types'
import { api, ApiError } from '@/lib/api'

interface OutfitModalProps {
  isOpen: boolean
  onClose: () => void
  model: Model
}

export function OutfitModal({ isOpen, onClose, model }: OutfitModalProps) {
  const [activeTab, setActiveTab] = useState<'original' | 'flatlay' | 'shop'>('original')
  const [isProcessing, setIsProcessing] = useState(false)
  const [flatLayResult, setFlatLayResult] = useState<any>(null)
  const [outfitPieces, setOutfitPieces] = useState<OutfitPiece[]>([])
  const [shoppingResults, setShoppingResults] = useState<any[]>([])
  const [extractedItems, setExtractedItems] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      // Reset state when modal opens
      setActiveTab('original')
      setFlatLayResult(null)
      setOutfitPieces([])
      setShoppingResults([])
      setExtractedItems([])
      setError(null)
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  const handleGenerateFlatlay = async () => {
    if (!model.imageUrl) return

    setIsProcessing(true)
    setError(null)

    try {
      console.log('Calling Gemini API with:', model.imageUrl)
      
      // Call the Gemini API
      const response = await api.convertToFlatLay(model.imageUrl)
      console.log('Gemini API response:', response)
      
      setFlatLayResult(response.data)
      setActiveTab('flatlay')
      
      // If the flat lay result contains extracted items, use them for shopping
      if (response.data.extractedItems && response.data.extractedItems.length > 0) {
        console.log('Using extracted items from flat lay:', response.data.extractedItems)
        setOutfitPieces(response.data.extractedItems)
        setExtractedItems(response.data.extractedItems)
      } else if (response.data.lensItems && response.data.lensItems.length > 0) {
        // Fallback to lens items if no extracted items
        console.log('Using Google Lens items from flat lay:', response.data.lensItems)
        setOutfitPieces(response.data.lensItems)
      }

      // If the flat lay result contains shopping results, use them
      if (response.data.shoppingResults && response.data.shoppingResults.length > 0) {
        console.log('Using shopping results from flat lay:', response.data.shoppingResults)
        setShoppingResults(response.data.shoppingResults)
      } else {
        // Fallback: try to get outfit pieces from the API
        try {
          const outfitResponse = await api.getModelOutfit(model.id)
          console.log('Outfit response:', outfitResponse)
          
          if (outfitResponse.data) {
            const piecesResponse = await api.getOutfitPieces(outfitResponse.data.id)
            console.log('Pieces response:', piecesResponse)
            setOutfitPieces(piecesResponse.data)
          }
        } catch (piecesError) {
          console.warn('Could not fetch outfit pieces:', piecesError)
          // Don't show error for pieces, as flat lay was successful
        }
      }
      
    } catch (error) {
      console.error('Error generating flat lay:', error)
      
      if (error instanceof ApiError) {
        setError(`API Error: ${error.message}`)
      } else {
        setError('Failed to generate flat lay. Please try again.')
      }
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="absolute inset-0 flex items-end md:items-center justify-center p-0 md:p-4">
        <div className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl md:rounded-lg flex flex-col animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-lg font-semibold">Outfit Details</h2>
            <button 
              onClick={onClose}
              className="touch-target p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200 flex-shrink-0">
            <button
              onClick={() => setActiveTab('original')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === 'original' 
                  ? 'border-b-2 border-gray-900 text-gray-900' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Original
            </button>
            <button
              onClick={() => setActiveTab('flatlay')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === 'flatlay' 
                  ? 'border-b-2 border-gray-900 text-gray-900' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Flat Lay
            </button>
            <button
              onClick={() => setActiveTab('shop')}
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === 'shop' 
                  ? 'border-b-2 border-gray-900 text-gray-900' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Shop Items
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {activeTab === 'original' && (
              <div className="p-4">
                <div className="max-w-md mx-auto">
                  <div className="relative aspect-[3/4] bg-gray-100 rounded-lg overflow-hidden">
                    <Image
                      src={model.imageUrl}
                      alt={model.name || 'Model outfit'}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 50vw"
                    />
                  </div>
                  
                  <div className="mt-4 space-y-3">
                    <button
                      onClick={handleGenerateFlatlay}
                      disabled={isProcessing}
                      className="w-full py-3 bg-gray-900 text-white font-medium rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
                    >
                      {isProcessing ? 'Generating Flat Lay...' : 'Generate Flat Lay'}
                    </button>
                    
                    {error && (
                      <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-sm text-red-600">{error}</p>
                      </div>
                    )}
                    
                    {model.name && (
                      <div className="text-center">
                        <h3 className="font-semibold text-gray-900">{model.name}</h3>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'flatlay' && (
              <div className="p-4">
                {flatLayResult ? (
                  <div className="max-w-md mx-auto">
                    <div className="relative bg-gray-100 rounded-lg overflow-hidden mb-4">
                      <Image
                        src={flatLayResult.flatLayImageUrl}
                        alt="Flat lay outfit"
                        width={400}
                        height={400}
                        className="object-contain w-full h-auto"
                        sizes="(max-width: 768px) 100vw, 50vw"
                      />
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Processing Time:</span>
                        <span className="font-medium">{flatLayResult.processingTime}s</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Confidence:</span>
                        <span className="font-medium">{Math.round(flatLayResult.confidence * 100)}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Status:</span>
                        <span className="font-medium capitalize">{flatLayResult.status}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Model:</span>
                        <span className="font-medium text-xs">{flatLayResult.modelUsed}</span>
                      </div>
                    </div>
                    
                    {flatLayResult.analysis && flatLayResult.analysis.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-medium text-gray-900 mb-2">Outfit Analysis</h4>
                        <div className="space-y-2">
                          {flatLayResult.analysis.map((item: any, index: number) => (
                            <div key={index} className="bg-white border border-gray-200 rounded-lg p-3">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-medium text-gray-900 capitalize">{item.type}</span>
                                <span className="text-sm text-gray-500 capitalize">{item.color}</span>
                              </div>
                              <p className="text-sm text-gray-600 line-clamp-2">{item.description}</p>
                              <span className="inline-block mt-1 px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded">
                                {item.position}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <p>Flat lay view will be generated here</p>
                    <p className="text-sm mt-1">Click "Generate Flat Lay" from the Original tab</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'shop' && (
              <div className="p-4">
                {shoppingResults.length > 0 ? (
                  <div className="space-y-6">
                    <h3 className="font-semibold text-gray-900 mb-4">Shop Similar Items</h3>
                    
                    {shoppingResults.map((itemResult) => {
                      // Find the corresponding extracted item to get the image
                      const extractedItem = extractedItems.find((item: any) => item.id === itemResult.itemId)
                      
                      return (
                        <div key={itemResult.itemId} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {extractedItem?.extractedImageUrl && (
                                <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                  <Image
                                    src={extractedItem.extractedImageUrl}
                                    alt={`Extracted ${itemResult.pieceType}`}
                                    width={64}
                                    height={64}
                                    className="object-cover w-full h-full"
                                  />
                                </div>
                              )}
                              <div>
                                <h4 className="font-medium text-gray-900 capitalize">
                                  {itemResult.pieceType}
                                </h4>
                                {extractedItem?.color && (
                                  <p className="text-sm text-gray-600">
                                    Color: {extractedItem.color}
                                  </p>
                                )}
                              </div>
                            </div>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {Math.round(itemResult.confidence * 100)}% match
                            </span>
                          </div>
                        
                          <div className="grid gap-3">
                            {itemResult.results.map((result: any, index: number) => (
                              <div 
                                key={index}
                                className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                              >
                                <div className="flex items-start space-x-3 mb-3">
                                  {result.imageUrl && (
                                    <div className="w-12 h-12 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                                      <Image
                                        src={result.imageUrl}
                                        alt="Product thumbnail"
                                        width={48}
                                        height={48}
                                        className="object-cover w-full h-full"
                                      />
                                    </div>
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start mb-1">
                                      <h5 className="font-medium text-gray-800 text-sm line-clamp-2">
                                        {result.title}
                                      </h5>
                                      {result.similarity && (
                                        <div className="flex items-center ml-2">
                                          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                            {Math.round(result.similarity * 100)}% match
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                    
                                    <div className="flex justify-between items-center mb-2">
                                      <span className="text-sm text-gray-600">{result.retailer}</span>
                                      {result.price && (
                                        <span className="font-semibold text-gray-900">{result.price}</span>
                                      )}
                                    </div>

                                    {result.source && (
                                      <div className="mb-2">
                                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                          {result.source === 'google_image_search' ? '🖼️ Image Search' :
                                           result.source === 'enhanced_google_search' ? '🔍 Enhanced Search' :
                                           result.source === 'serp_api_lens' ? '👁️ Lens Search' :
                                           result.source === 'enhanced_text_search' ? '📝 Text Search' :
                                           '🔍 Search'}
                                        </span>
                                      </div>
                                    )}
                                    
                                    <a
                                      href={result.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block w-full py-2 bg-gray-900 text-white text-center rounded-md hover:bg-gray-800 transition-colors text-sm font-medium"
                                    >
                                      View on {result.retailer}
                                    </a>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        
                          {itemResult.results.length === 0 && (
                            <div className="text-center text-gray-500 py-4">
                              <p className="text-sm">No shopping results found for this item</p>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : outfitPieces.length > 0 ? (
                  <div className="space-y-4">
                    <h3 className="font-semibold text-gray-900 mb-4">Identified Pieces</h3>
                    <p className="text-sm text-gray-600 mb-4">Shopping links are being generated...</p>
                    
                    <div className="grid gap-4">
                      {outfitPieces.map((piece) => (
                        <div 
                          key={piece.id}
                          className="bg-white border border-gray-200 rounded-lg p-4"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="font-medium text-gray-900 capitalize">
                              {piece.pieceType}
                            </h4>
                            <span className="text-sm text-gray-500">
                              {Math.round(piece.confidenceScore * 100)}% match
                            </span>
                          </div>
                          
                          {piece.description && (
                            <p className="text-sm text-gray-600 mb-2">
                              {piece.description}
                            </p>
                          )}
                          
                          <button 
                            onClick={() => window.open(`https://www.google.com/search?q=${encodeURIComponent(piece.pieceType + ' buy online')}`, '_blank')}
                            className="w-full py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors text-sm font-medium"
                          >
                            Search for Similar Items
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <p>Shopping options will appear here</p>
                    <p className="text-sm mt-1">Generate flat lay first to identify pieces</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}