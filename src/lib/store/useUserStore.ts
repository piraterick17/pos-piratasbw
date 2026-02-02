// src/lib/store/useUserStore.ts
import { create } from 'zustand';
import { getOrCreateUserProfile, signOut, type AppUser } from '../auth';
import { supabase } from '../supabase/client';

interface UserState {
  user: AppUser | null;
  isLoading: boolean;
  fetchUser: () => Promise<void>;
  clearUser: () => void;
  logout: () => Promise<void>;
}

const clearCartData = () => {
  // Clear cart from localStorage when logging out
  try {
    const vendorId = localStorage.getItem('vendor-id');
    if (vendorId) {
      localStorage.removeItem(`cart-storage-${vendorId}`);
      localStorage.removeItem('vendor-id');
    }
    // Also clear legacy cart storage
    localStorage.removeItem('cart-storage');
  } catch (error) {
    console.error('Error clearing cart data:', error);
  }
};

export const useUserStore = create<UserState>((set) => ({
  user: null,
  isLoading: true,
  fetchUser: async () => {
    set({ isLoading: true });
    try {
      // Verificar que Supabase esté disponible
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) {
        console.error("Error obteniendo sesión:", sessionError);
        set({ user: null, isLoading: false });
        return;
      }

      if (!session) {
        console.log("No hay sesión activa");
        set({ user: null, isLoading: false });
        return;
      }

      console.log("Sesión encontrada, obteniendo perfil del usuario...");
      const userProfile = await getOrCreateUserProfile();

      if (!userProfile) {
        console.error("No se pudo obtener o crear el perfil del usuario");
        set({ user: null, isLoading: false });
        return;
      }

      console.log("Perfil de usuario cargado:", userProfile.nombre);

      // Store vendor ID in localStorage for cart isolation
      if (userProfile?.id) {
        localStorage.setItem('vendor-id', userProfile.id);
      }

      set({ user: userProfile, isLoading: false });
    } catch (error) {
      console.error("Error al obtener el perfil del usuario:", error);
      set({ user: null, isLoading: false });
    }
  },
  clearUser: () => {
    clearCartData();
    set({ user: null, isLoading: false });
  },
  logout: async () => {
    try {
      await signOut();
      clearCartData();
      set({ user: null });
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }
  },
}));

// Subscribe to auth state changes to handle session expiration
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_OUT' || !session) {
    useUserStore.getState().clearUser();
  }
});