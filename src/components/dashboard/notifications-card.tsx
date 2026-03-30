'use client'

import { Bell, Info, AlertCircle, CheckCircle, Clock } from 'lucide-react'

interface Notification {
  id: string
  titre: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  date_creation: string
  lue: boolean
}

interface NotificationsCardProps {
  notifications: Notification[]
}

export default function NotificationsCard({ notifications }: NotificationsCardProps) {
  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />
      default:
        return <Info className="w-5 h-5 text-blue-600" />
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Il y a quelques minutes'
    if (diffInHours < 24) return `Il y a ${diffInHours}h`
    if (diffInHours < 48) return 'Hier'
    return date.toLocaleDateString('fr-FR')
  }

  const unreadCount = notifications.filter(n => !n.lue).length

  return (
    <div className="card-3d p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <Bell className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Notifications</h3>
            <p className="text-sm text-gray-600">Recentes</p>
          </div>
        </div>
        {unreadCount > 0 && (
          <span className="px-2 py-1 bg-green-600 text-white text-xs font-medium rounded-full">
            {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucune notification</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`
                p-4 rounded-lg border transition-all duration-200
                ${notification.lue 
                  ? 'bg-gray-50 border-gray-200' 
                  : 'bg-white border-green-200 shadow-sm'
                }
              `}
            >
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {notification.titre}
                    </h4>
                    <span className="flex items-center text-xs text-gray-500">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatDate(notification.date_creation)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                    {notification.message}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {notifications.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button className="text-sm text-green-600 hover:text-green-700 font-medium">
            Voir toutes les notifications
          </button>
        </div>
      )}
    </div>
  )
}
