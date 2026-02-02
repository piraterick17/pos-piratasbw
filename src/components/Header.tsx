import React from 'react';
import { LogOut, User, Menu } from 'lucide-react';
import { useUserStore } from '../lib/store/useUserStore';
import toast from 'react-hot-toast';
import NotificationBell from './NotificationBell';

interface HeaderProps {
  title: string;
  onMenuClick: () => void;
}

export function Header({ title, onMenuClick }: HeaderProps) {
  const { user, logout } = useUserStore();

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Sesión cerrada correctamente');
    } catch (error) {
      toast.error('Error al cerrar sesión');
    }
  };

  return (
    <header className="bg-boneWhite shadow-sm border-b border-pirateRed border-opacity-20">
      <div className="w-full mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <button
              onClick={onMenuClick}
              className="mr-2 sm:mr-4 p-1.5 sm:p-2 text-pirateRed hover:bg-pirateRed hover:bg-opacity-10 rounded-lg transition-colors"
              title="Abrir menú"
            >
              <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <h1 className="text-lg sm:text-xl lg:text-2xl font-bold text-pirateRed truncate">{title}</h1>
          </div>
          
          <div className="flex items-center space-x-2 sm:space-x-4">
            <NotificationBell />
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-2 sm:px-3 py-1.5 sm:py-2 border border-pirateRed border-opacity-30 shadow-sm text-xs sm:text-sm leading-4 font-medium rounded-md text-pirateRed bg-boneWhite hover:bg-pirateRed hover:bg-opacity-10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pirateRed transition-colors"
            >
              <LogOut className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Cerrar Sesión</span>
              <span className="sm:hidden">Salir</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}