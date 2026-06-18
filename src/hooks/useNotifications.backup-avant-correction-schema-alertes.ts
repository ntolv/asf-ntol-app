'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

interface Notification {
  id: string
  titre: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
  date_creation: string
  lue: boolean
  destinataire_id: string
}

interface NotificationsState {
  notifications: Notification[]
  loading: boolean
  error: string | null
  unreadCount: number
}

export function useNotifications(userId: string | undefined) {
  const [state, setState] = useState<NotificationsState>({
    notifications: [],
    loading: true,
    error: null,
    unreadCount: 0
  })

  useEffect(() => {
    if (!userId) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('destinataire_id', userId)
          .order('date_creation', { ascending: false })
          .limit(10)

        if (error) {
          setState(prev => ({ 
            ...prev, 
            loading: false, 
            error: 'Erreur lors du chargement des notifications' 
          }))
          return
        }

        const notifications = data || []
        const unreadCount = notifications.filter(n => !n.lue).length

        setState({
          notifications,
          loading: false,
          error: null,
          unreadCount
        })
      } catch (error) {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: 'Erreur lors du chargement des notifications' 
        }))
      }
    }

    fetchNotifications()

    // Écouter les nouvelles notifications
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `destinataire_id=eq.${userId}`
        },
        () => {
          fetchNotifications()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId])

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ lue: true })
        .eq('id', notificationId)

      if (error) {
        console.error('Erreur lors du marquage comme lu:', error)
        return
      }

      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => 
          n.id === notificationId ? { ...n, lue: true } : n
        ),
        unreadCount: Math.max(0, prev.unreadCount - 1)
      }))
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error)
    }
  }

  const markAllAsRead = async () => {
    if (!userId) return

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ lue: true })
        .eq('destinataire_id', userId)
        .eq('lue', false)

      if (error) {
        console.error('Erreur lors du marquage de toutes comme lues:', error)
        return
      }

      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(n => ({ ...n, lue: true })),
        unreadCount: 0
      }))
    } catch (error) {
      console.error('Erreur lors du marquage de toutes comme lues:', error)
    }
  }

  return {
    ...state,
    markAsRead,
    markAllAsRead
  }
}
