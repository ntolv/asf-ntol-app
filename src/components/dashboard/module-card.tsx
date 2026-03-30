'use client'

import { LucideIcon } from 'lucide-react'

interface ModuleCardProps {
  title: string
  description: string
  icon: LucideIcon
  color: string
  count?: number
  onClick?: () => void
}

export default function ModuleCard({ 
  title, 
  description, 
  icon: Icon, 
  color, 
  count = 0,
  onClick 
}: ModuleCardProps) {
  return (
    <div 
      className="card-3d p-6 cursor-pointer hover:scale-[1.02] transition-transform duration-200"
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`p-3 rounded-lg ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
        {count > 0 && (
          <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
            {count}
          </span>
        )}
      </div>
      
      <h3 className="text-lg font-bold text-gray-900 mb-2">{title}</h3>
      <p className="text-sm text-gray-600 mb-4">{description}</p>
      
      <div className="flex items-center text-green-600 text-sm font-medium">
        <span>Accéder</span>
        <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  )
}
