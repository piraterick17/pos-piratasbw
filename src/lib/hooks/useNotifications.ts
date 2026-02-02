import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabase/client';
import { useUserStore } from '../store/useUserStore';
import toast from 'react-hot-toast';

export interface Notification {
  id: string;
  user_id: string;
  tipo: 'pedido' | 'stock' | 'mensaje' | 'pago' | 'entrega' | 'sistema' | 'cocina';
  titulo: string;
  mensaje: string;
  icono: string;
  link?: string;
  leida: boolean;
  data: any;
  created_at: string;
}

export interface NotificationConfig {
  user_id: string;
  nuevo_pedido: boolean;
  stock_bajo: boolean;
  pedido_listo: boolean;
  mensajes: boolean;
  sonido: boolean;
  push_enabled: boolean;
}

const SOUNDS: Record<string, string> = {
  pedido: '/sounds/new-order.mp3',
  stock: '/sounds/alert.mp3',
  mensaje: '/sounds/message.mp3',
  pago: '/sounds/payment.mp3',
  entrega: '/sounds/delivery.mp3',
  sistema: '/sounds/notification.mp3',
  cocina: '/sounds/kitchen.mp3',
};

export const useNotifications = () => {
  const { user } = useUserStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [config, setConfig] = useState<NotificationConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const playSound = useCallback((tipo: string) => {
    if (!config?.sonido) return;

    const audio = new Audio(SOUNDS[tipo] || SOUNDS.sistema);
    audio.volume = 0.5;
    audio.play().catch(() => {});
  }, [config?.sonido]);

  const showToastNotification = useCallback((notification: Notification) => {
    toast(
      `${notification.icono} ${notification.titulo}: ${notification.mensaje}`,
      {
        duration: 5000,
        position: 'top-right',
        style: {
          background: '#fff',
          color: '#363636',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        },
        icon: notification.icono,
      }
    );
  }, []);

  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('notificaciones')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.leida).length || 0);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const loadConfig = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('notificaciones_config')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        const { data: newConfig, error: insertError } = await supabase
          .from('notificaciones_config')
          .insert([{ user_id: user.id }])
          .select()
          .single();

        if (insertError) throw insertError;
        setConfig(newConfig);
      } else {
        setConfig(data);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
  }, [user?.id]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notificaciones')
        .update({ leida: true })
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, leida: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { error } = await supabase.rpc('mark_all_as_read', {
        p_user_id: user.id,
      });

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, leida: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  }, [user?.id]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notificaciones')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      setNotifications(prev => {
        const notification = prev.find(n => n.id === notificationId);
        if (notification && !notification.leida) {
          setUnreadCount(prevCount => Math.max(0, prevCount - 1));
        }
        return prev.filter(n => n.id !== notificationId);
      });
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  }, []);

  const updateConfig = useCallback(async (updates: Partial<NotificationConfig>) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('notificaciones_config')
        .update(updates)
        .eq('user_id', user.id);

      if (error) throw error;

      setConfig(prev => (prev ? { ...prev, ...updates } : null));
    } catch (error) {
      console.error('Error updating config:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    loadNotifications();
    loadConfig();

    const channel = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificaciones',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;

          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);

          showToastNotification(newNotification);
          playSound(newNotification.tipo);
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user?.id, loadNotifications, loadConfig, showToastNotification, playSound]);

  return {
    notifications,
    unreadCount,
    config,
    loading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    updateConfig,
    refresh: loadNotifications,
  };
};
