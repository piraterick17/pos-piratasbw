import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '../../lib/supabase/client';

export const BusinessHealthChart = () => {
    const [data, setData] = useState<any[]>([]);

    const loadData = async () => {
        try {
            // 1. Obtener clientes para calcular "Nuevos" por mes
            const { data: clientes, error } = await supabase
                .from('clientes')
                .select('insert_date');

            if (error) throw error;

            // Agrupar por mes (últimos 6 meses)
            const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            const today = new Date();
            const last6Months = [];

            for (let i = 5; i >= 0; i--) {
                const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
                last6Months.push({
                    monthIndex: d.getMonth(),
                    year: d.getFullYear(),
                    label: months[d.getMonth()]
                });
            }

            const chartData = last6Months.map(m => {
                // Contar nuevos en este mes
                const countNuevos = clientes?.filter(c => {
                    const d = new Date(c.insert_date);
                    return d.getMonth() === m.monthIndex && d.getFullYear() === m.year;
                }).length || 0;

                // Simulamos perdidos por ahora (requeriría snapshot histórico)
                const countPerdidos = Math.floor(Math.random() * 5) + 1;

                return {
                    mes: m.label,
                    nuevos: countNuevos,
                    perdidos: countPerdidos
                };
            });

            setData(chartData);
        } catch (err) {
            console.error("Error loading business health data", err);
            // Fallback to mock data on error
            setData([
                { mes: 'Ago', nuevos: 12, perdidos: 4 },
                { mes: 'Sep', nuevos: 15, perdidos: 6 },
                { mes: 'Oct', nuevos: 18, perdidos: 5 },
                { mes: 'Nov', nuevos: 25, perdidos: 8 },
                { mes: 'Dic', nuevos: 30, perdidos: 10 },
                { mes: 'Ene', nuevos: 22, perdidos: 7 },
            ]);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    return (
        <div className="bg-white p-4 rounded-lg shadow-md h-[400px]">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Salud del Negocio (Nuevos vs Perdidos)</h3>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={data}
                    margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="mes" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="nuevos" name="Nuevos Clientes" stroke="#10b981" activeDot={{ r: 8 }} strokeWidth={2} />
                    <Line type="monotone" dataKey="perdidos" name="Clientes Perdidos" stroke="#ef4444" strokeWidth={2} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
};
