'use client'

import { Phone, MessageCircle, User, Mail, Shield, Tag } from 'lucide-react'

interface MemberCardProps {
  member: {
    nom_complet: string
    email: string
    telephone: string
    statut_associatif: string
    categorie: string
  }
}

export default function MemberCard({ member }: MemberCardProps) {
  const handleCall = () => {
    if (member.telephone) {
      window.open(`tel:${member.telephone}`)
    }
  }

  const handleWhatsApp = () => {
    if (member.telephone) {
      const phoneNumber = member.telephone.replace(/[\s\-\(\)]/g, '')
      window.open(`https://wa.me/${phoneNumber}`, '_blank')
    }
  }

  return (
    <div className="card-3d p-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-lg">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{member.nom_complet}</h2>
            <p className="text-sm text-gray-600">Membre actif</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={handleCall}
            className="p-3 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
            title="Appeler"
          >
            <Phone className="w-5 h-5" />
          </button>
          <button
            onClick={handleWhatsApp}
            className="p-3 bg-green-100 text-green-600 rounded-lg hover:bg-green-200 transition-colors"
            title="WhatsApp"
          >
            <MessageCircle className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-3">
          <Mail className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-sm text-gray-600">Email</p>
            <p className="font-medium text-gray-900">{member.email}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Phone className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-sm text-gray-600">Téléphone</p>
            <p className="font-medium text-gray-900">{member.telephone || 'Non renseigné'}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Shield className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-sm text-gray-600">Statut associatif</p>
            <p className="font-medium text-gray-900">{member.statut_associatif}</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Tag className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-sm text-gray-600">Catégorie</p>
            <p className="font-medium text-gray-900">{member.categorie}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
