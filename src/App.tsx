import React, { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { useLocation } from 'react-router-dom'; // <--- IMPORTANTE: Hook de navegación
import { useUserStore } from './lib/store/useUserStore';
import { LoginForm } from './components/LoginForm';
import { ResetPasswordForm } from './components/ResetPasswordForm';
import Analytics from './pages/Analytics';
import { Productos } from './pages/Productos';
import { Clientes } from './pages/Clientes';
import { Vender } from './pages/Vender';
import { Pedidos } from './pages/Pedidos';
import { PedidoDetalle } from './pages/PedidoDetalle';
import { Transacciones } from './pages/Transacciones';
import { Reportes } from './pages/Reportes';
import { GestionEnvios } from './pages/GestionEnvios';
import { MisEntregas } from './pages/MisEntregas';
import { DashboardEntregas } from './pages/DashboardEntregas';
import { Insumos } from './pages/Insumos';
import { Mermas } from './pages/Mermas';
import { Proveedores } from './pages/Proveedores';
import { Roles } from './pages/Roles';
import Usuarios from './pages/Usuarios';
import { UnifiedKitchenView } from './pages/UnifiedKitchenView';
import { GestionFinanciera } from './pages/GestionFinanciera';
import Repartidores from './pages/Repartidores';
import CRM from './pages/CRM';
import WhatsApp from './pages/WhatsApp';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Dashboard } from './pages/Dashboard'; // <--- Importado desde PAGES
import { DashboardDesayunos } from './pages/DashboardDesayunos';

function App() {
  const { user, isLoading, fetchUser } = useUserStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Hook de navegación para leer la URL actual (reemplaza window.location.hash)
  const location = useLocation();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        await fetchUser();
      } catch (error) {
        console.error('Error during app initialization:', error);
      } finally {
        setIsInitialized(true);
      }
    };
    
    initializeApp();
  }, [fetchUser]);

  // Check if we're on the reset password page
  const isResetPasswordPage = location.pathname === '/reset-password';

  // If we're on the reset password page, show the reset form
  if (isResetPasswordPage) {
    return (
      <>
        <ResetPasswordForm />
        <Toaster position="top-right" />
      </>
    );
  }

  // Lógica de Rutas: Obtener la página actual desde el pathname (ej: /vender -> vender)
  // Si la ruta es raíz ("/") o vacía, usamos 'dashboard' por defecto.
  const currentPath = location.pathname.slice(1) || 'dashboard';
  const [currentPage, ...params] = currentPath.split('/');

  // URL del logo - puedes cambiar esta URL por la de tu logo
  const logoUrl = "https://images.pexels.com/photos/1566837/pexels-photo-1566837.jpeg?auto=compress&cs=tinysrgb&w=200&h=200&fit=crop";

  const getPageTitle = () => {
    switch (currentPage) {
      case 'productos': return 'Productos';
      case 'clientes': return 'Clientes';
      case 'vender': return 'Punto de Venta';
      case 'pedidos': return params.length > 0 ? 'Detalles del Pedido' : 'Pedidos Activos';
      case 'transacciones': return 'Transacciones';
      case 'reportes': return 'Reportes';
      case 'analytics': return 'Análisis Avanzado';
      case 'gestion-envios': return 'Gestión de Envíos';
      case 'mis-entregas': return 'Mis Entregas';
      case 'dashboard-entregas': return 'Dashboard de Entregas';
      case 'dashboard-desayunos': return 'Dashboard Desayunos';
      case 'gestion-financiera': return 'Gestión Financiera';
      case 'insumos': return 'Insumos';
      case 'mermas': return 'Mermas';
      case 'proveedores': return 'Proveedores';
      case 'repartidores': return 'Repartidores';
      case 'crm': return 'CRM y Fidelización';
      case 'roles': return 'Roles y Permisos';
      case 'usuarios': return 'Gestión de Usuarios';
      case 'cocina': return 'Sistema de Cocina';
      case 'whatsapp': return 'WhatsApp Business';
      case 'dashboard': return 'Dashboard';
      default: return 'Dashboard';
    }
  };

  if (isLoading || !isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Cargando sistema...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginForm />
        <Toaster position="top-right" />
      </>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'productos':
        return <ProtectedRoute routeName="productos"><Productos /></ProtectedRoute>;
      case 'clientes':
        return <ProtectedRoute routeName="clientes"><Clientes /></ProtectedRoute>;
      case 'vender':
        return <ProtectedRoute routeName="vender"><Vender /></ProtectedRoute>;
      case 'pedidos':
        return (
          <ProtectedRoute routeName="pedidos">
            {params.length > 0 ? <PedidoDetalle pedidoId={params[0]} /> : <Pedidos />}
          </ProtectedRoute>
        );
      case 'transacciones':
        return <ProtectedRoute routeName="transacciones"><Transacciones /></ProtectedRoute>;
      case 'reportes':
        return <ProtectedRoute routeName="reportes"><Reportes /></ProtectedRoute>;
      case 'analytics':
        return <ProtectedRoute routeName="analytics"><Analytics /></ProtectedRoute>;
      case 'gestion-envios':
        return <ProtectedRoute routeName="gestion-envios"><GestionEnvios /></ProtectedRoute>;
      case 'mis-entregas':
        return <ProtectedRoute routeName="mis-entregas"><MisEntregas /></ProtectedRoute>;
      case 'dashboard-entregas':
        return <ProtectedRoute routeName="dashboard-entregas"><DashboardEntregas /></ProtectedRoute>;
      case 'dashboard-desayunos':
        return <ProtectedRoute routeName="dashboard-desayunos"><DashboardDesayunos /></ProtectedRoute>;
      case 'gestion-financiera':
        return <ProtectedRoute routeName="gestion-financiera"><GestionFinanciera /></ProtectedRoute>;
      case 'insumos':
        return <ProtectedRoute routeName="insumos"><Insumos /></ProtectedRoute>;
      case 'mermas':
        return <ProtectedRoute routeName="mermas"><Mermas /></ProtectedRoute>;
      case 'proveedores':
        return <ProtectedRoute routeName="proveedores"><Proveedores /></ProtectedRoute>;
      case 'repartidores':
        return <ProtectedRoute routeName="repartidores"><Repartidores /></ProtectedRoute>;
      case 'crm':
        return <ProtectedRoute routeName="crm"><CRM /></ProtectedRoute>;
      case 'roles':
        return <ProtectedRoute routeName="roles"><Roles /></ProtectedRoute>;
      case 'usuarios':
        return <ProtectedRoute routeName="usuarios"><Usuarios /></ProtectedRoute>;
      case 'cocina':
        return <ProtectedRoute routeName="cocina"><UnifiedKitchenView /></ProtectedRoute>;
      case 'whatsapp':
        return <ProtectedRoute routeName="whatsapp"><WhatsApp /></ProtectedRoute>;
      
      // Nueva Ruta para Dashboard y Default
      case 'dashboard':
        return <ProtectedRoute routeName="dashboard"><Dashboard /></ProtectedRoute>;
      default:
        // Si no coincide con nada, mostramos Dashboard por defecto
        return <ProtectedRoute routeName="dashboard"><Dashboard /></ProtectedRoute>;
    }
  };

  return (
    <>
      <div className="flex h-screen bg-gradient-to-br from-boneWhite to-white">
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
          logoSrc={logoUrl}
        />
        <div className="flex-1 flex flex-col overflow-hidden transition-all duration-300">
          <Header title={getPageTitle()} onMenuClick={() => setIsSidebarOpen(prev => !prev)} />
          <main className="flex-1 overflow-hidden bg-gradient-to-br from-boneWhite via-white to-gray-50">
            {renderPage()}
          </main>
        </div>
      </div>
      <Toaster position="top-right" />
    </>
  );
}

export default App;