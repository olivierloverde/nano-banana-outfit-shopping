'use client'

import { ModelFeed } from '@/components/ModelFeed'
import { Header } from '@/components/Header'

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Header />
      <div className="pt-16"> {/* Account for fixed header */}
        <ModelFeed />
      </div>
    </main>
  )
}