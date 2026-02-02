import { create } from 'zustand';
import { supabase } from '../supabase/client';
import toast from 'react-hot-toast';

export interface CuentaPorPagar {
  id?: number;
  proveedor_id: number;
  movimiento_financiero_id?: number;
  movimiento_insumo_id?: number;
  monto_total: number;
  monto_pagado: number;
  saldo_pendiente: number;
  fecha_compra: string;
  fecha_vencimiento: string;
  estatus: 'pendiente' | 'pagado_parcial' | 'pagado_completo' | 'vencido';
  referencia_compra?: string;
  notas?: string;
  created_at?: string;
  updated_at?: string;
  proveedor?: {
    id: number;
    nombre: string;
    contacto_nombre?: string;
    telefono?: string;
    email?: string;
  };
}

export interface PagoCxP {
  id?: number;
  cuenta_por_pagar_id: number;
  monto_pagado: number;
  metodo_pago: string;
  fecha_pago: string;
  movimiento_financiero_id?: number;
  notas?: string;
  usuario_id?: string;
  created_at?: string;
}

export interface ResumenProveedor {
  proveedor_id: number;
  proveedor_nombre: string;
  total_cuentas: number;
  cuentas_pendientes: number;
  cuentas_vencidas: number;
  monto_total: number;
  monto_pagado: number;
  saldo_pendiente: number;
}

export interface CxPConAntiguedad extends CuentaPorPagar {
  proveedor_nombre: string;
  dias_vencidos: number;
  rango_antiguedad: string;
}

interface FiltrosCxP {
  proveedor_id?: number;
  estatus?: string;
  fecha_desde?: string;
  fecha_hasta?: string;
}

interface CuentasPorPagarState {
  cuentas: CuentaPorPagar[];
  cuentaActual: CuentaPorPagar | null;
  pagos: PagoCxP[];
  resumenProveedores: ResumenProveedor[];
  isLoading: boolean;
  isSubmitting: boolean;

  // Cuentas por Pagar - CRUD
  fetchCuentas: (filtros?: FiltrosCxP) => Promise<void>;
  fetchCuentaById: (id: number) => Promise<CuentaPorPagar | null>;
  createCuenta: (cuenta: Omit<CuentaPorPagar, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;

  // Pagos
  fetchPagosByCuentaId: (cuentaId: number) => Promise<void>;
  registrarPago: (pago: Omit<PagoCxP, 'id' | 'created_at' | 'movimiento_financiero_id'>) => Promise<void>;

  // Reportes y Análisis
  fetchResumenProveedores: () => Promise<void>;
  getCuentasVencidas: () => Promise<CuentaPorPagar[]>;
  getCuentasPorVencer: (diasAntes: number) => Promise<CuentaPorPagar[]>;
  getTotalPendiente: () => number;
  marcarCuentasVencidas: () => Promise<void>;

  // Estadísticas
  getEstadisticas: () => {
    totalPendiente: number;
    totalVencido: number;
    totalPorVencer: number;
    cantidadCuentas: number;
    cantidadVencidas: number;
  };
}

export const useCuentasPorPagarStore = create<CuentasPorPagarState>((set, get) => ({
  cuentas: [],
  cuentaActual: null,
  pagos: [],
  resumenProveedores: [],
  isLoading: false,
  isSubmitting: false,

  fetchCuentas: async (filtros = {}) => {
    set({ isLoading: true });
    try {
      let query = supabase
        .from('finanzas_cuentas_por_pagar')
        .select(`
          *,
          proveedor:proveedores(id, nombre, contacto_nombre, telefono, email)
        `)
        .order('fecha_vencimiento', { ascending: true });

      // Aplicar filtros
      if (filtros.proveedor_id) {
        query = query.eq('proveedor_id', filtros.proveedor_id);
      }
      if (filtros.estatus) {
        query = query.eq('estatus', filtros.estatus);
      }
      if (filtros.fecha_desde) {
        query = query.gte('fecha_compra', filtros.fecha_desde);
      }
      if (filtros.fecha_hasta) {
        query = query.lte('fecha_compra', filtros.fecha_hasta + 'T23:59:59');
      }

      const { data, error } = await query;

      if (error) throw error;
      set({ cuentas: data || [] });
    } catch (error: any) {
      console.error('Error fetching cuentas por pagar:', error);
      toast.error('Error al cargar las cuentas por pagar');
    } finally {
      set({ isLoading: false });
    }
  },

  fetchCuentaById: async (id: number) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('finanzas_cuentas_por_pagar')
        .select(`
          *,
          proveedor:proveedores(id, nombre, contacto_nombre, telefono, email)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      set({ cuentaActual: data });
      return data;
    } catch (error: any) {
      console.error('Error fetching cuenta:', error);
      toast.error('Error al cargar la cuenta por pagar');
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  createCuenta: async (cuenta) => {
    set({ isSubmitting: true });
    try {
      const { error } = await supabase
        .from('finanzas_cuentas_por_pagar')
        .insert([cuenta]);

      if (error) throw error;
      toast.success('Cuenta por pagar creada exitosamente');
      await get().fetchCuentas();
    } catch (error: any) {
      console.error('Error creating cuenta:', error);
      toast.error('Error al crear cuenta por pagar');
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  fetchPagosByCuentaId: async (cuentaId: number) => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('finanzas_pagos_cxp')
        .select('*')
        .eq('cuenta_por_pagar_id', cuentaId)
        .order('fecha_pago', { ascending: false });

      if (error) throw error;
      set({ pagos: data || [] });
    } catch (error: any) {
      console.error('Error fetching pagos:', error);
      toast.error('Error al cargar los pagos');
    } finally {
      set({ isLoading: false });
    }
  },

  registrarPago: async (pago) => {
    set({ isSubmitting: true });
    try {
      // Validar que el monto no sea negativo o cero
      if (pago.monto_pagado <= 0) {
        toast.error('El monto del pago debe ser mayor a cero');
        return;
      }

      // Obtener la cuenta actual para validar el saldo
      const { data: cuenta, error: cuentaError } = await supabase
        .from('finanzas_cuentas_por_pagar')
        .select('saldo_pendiente')
        .eq('id', pago.cuenta_por_pagar_id)
        .single();

      if (cuentaError) throw cuentaError;

      if (pago.monto_pagado > cuenta.saldo_pendiente) {
        toast.error(`El monto del pago ($${pago.monto_pagado}) excede el saldo pendiente ($${cuenta.saldo_pendiente})`);
        return;
      }

      // Insertar el pago (el trigger se encarga de actualizar saldos y crear movimiento)
      const { error } = await supabase
        .from('finanzas_pagos_cxp')
        .insert([pago]);

      if (error) throw error;

      toast.success('Pago registrado exitosamente');

      // Refrescar datos
      await get().fetchCuentas();
      if (get().cuentaActual?.id === pago.cuenta_por_pagar_id) {
        await get().fetchCuentaById(pago.cuenta_por_pagar_id);
        await get().fetchPagosByCuentaId(pago.cuenta_por_pagar_id);
      }
    } catch (error: any) {
      console.error('Error registrando pago:', error);
      toast.error(error.message || 'Error al registrar el pago');
      throw error;
    } finally {
      set({ isSubmitting: false });
    }
  },

  fetchResumenProveedores: async () => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase
        .from('vista_cxp_resumen_proveedor')
        .select('*')
        .order('saldo_pendiente', { ascending: false });

      if (error) throw error;
      set({ resumenProveedores: data || [] });
    } catch (error: any) {
      console.error('Error fetching resumen proveedores:', error);
      toast.error('Error al cargar resumen de proveedores');
    } finally {
      set({ isLoading: false });
    }
  },

  getCuentasVencidas: async () => {
    try {
      const { data, error } = await supabase
        .from('finanzas_cuentas_por_pagar')
        .select(`
          *,
          proveedor:proveedores(id, nombre, contacto_nombre, telefono, email)
        `)
        .eq('estatus', 'vencido')
        .order('fecha_vencimiento', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching cuentas vencidas:', error);
      return [];
    }
  },

  getCuentasPorVencer: async (diasAntes: number = 7) => {
    try {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() + diasAntes);
      const fechaLimiteStr = fechaLimite.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('finanzas_cuentas_por_pagar')
        .select(`
          *,
          proveedor:proveedores(id, nombre, contacto_nombre, telefono, email)
        `)
        .in('estatus', ['pendiente', 'pagado_parcial'])
        .lte('fecha_vencimiento', fechaLimiteStr)
        .gte('fecha_vencimiento', new Date().toISOString().split('T')[0])
        .order('fecha_vencimiento', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching cuentas por vencer:', error);
      return [];
    }
  },

  getTotalPendiente: () => {
    const { cuentas } = get();
    return cuentas.reduce((sum, cuenta) => {
      if (cuenta.estatus !== 'pagado_completo') {
        return sum + cuenta.saldo_pendiente;
      }
      return sum;
    }, 0);
  },

  marcarCuentasVencidas: async () => {
    try {
      const { data, error } = await supabase.rpc('marcar_cxp_vencidas');

      if (error) throw error;

      if (data && data > 0) {
        toast.success(`${data} cuenta(s) marcada(s) como vencida(s)`);
        await get().fetchCuentas();
      }
    } catch (error: any) {
      console.error('Error marcando cuentas vencidas:', error);
      toast.error('Error al actualizar cuentas vencidas');
    }
  },

  getEstadisticas: () => {
    const { cuentas } = get();

    const totalPendiente = cuentas
      .filter(c => c.estatus !== 'pagado_completo')
      .reduce((sum, c) => sum + c.saldo_pendiente, 0);

    const totalVencido = cuentas
      .filter(c => c.estatus === 'vencido')
      .reduce((sum, c) => sum + c.saldo_pendiente, 0);

    const hoy = new Date();
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() + 7);

    const totalPorVencer = cuentas
      .filter(c => {
        if (c.estatus === 'pagado_completo' || c.estatus === 'vencido') return false;
        const fechaVenc = new Date(c.fecha_vencimiento);
        return fechaVenc >= hoy && fechaVenc <= fechaLimite;
      })
      .reduce((sum, c) => sum + c.saldo_pendiente, 0);

    const cantidadCuentas = cuentas.filter(c => c.estatus !== 'pagado_completo').length;
    const cantidadVencidas = cuentas.filter(c => c.estatus === 'vencido').length;

    return {
      totalPendiente,
      totalVencido,
      totalPorVencer,
      cantidadCuentas,
      cantidadVencidas,
    };
  },
}));
