import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface SalesDistributionProps {
    data: {
        segmento: string;
        total: number;
        color: string;
    }[];
}

export const SalesDistributionChart: React.FC<SalesDistributionProps> = ({ data }) => {
    return (
        <div className="bg-white p-4 rounded-lg shadow-md h-[400px]">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">Distribución de Ventas por Segmento</h3>
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="total"
                        nameKey="segmento"
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Pie>
                    <Tooltip
                        formatter={(value: number) => `$${value.toLocaleString()}`}
                    />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
};
