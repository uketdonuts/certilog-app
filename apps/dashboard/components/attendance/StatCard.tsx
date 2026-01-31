'use client';

import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color: 'green' | 'yellow' | 'red' | 'purple' | 'blue' | 'gray';
}

const colorClasses = {
  green: {
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
    iconBg: 'bg-emerald-100',
    iconColor: 'text-emerald-600',
    trendUp: 'text-emerald-600',
    trendDown: 'text-rose-600',
  },
  yellow: {
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    trendUp: 'text-emerald-600',
    trendDown: 'text-rose-600',
  },
  red: {
    bg: 'bg-rose-50',
    border: 'border-rose-100',
    iconBg: 'bg-rose-100',
    iconColor: 'text-rose-600',
    trendUp: 'text-emerald-600',
    trendDown: 'text-rose-600',
  },
  purple: {
    bg: 'bg-violet-50',
    border: 'border-violet-100',
    iconBg: 'bg-violet-100',
    iconColor: 'text-violet-600',
    trendUp: 'text-emerald-600',
    trendDown: 'text-rose-600',
  },
  blue: {
    bg: 'bg-sky-50',
    border: 'border-sky-100',
    iconBg: 'bg-sky-100',
    iconColor: 'text-sky-600',
    trendUp: 'text-emerald-600',
    trendDown: 'text-rose-600',
  },
  gray: {
    bg: 'bg-gray-50',
    border: 'border-gray-100',
    iconBg: 'bg-gray-100',
    iconColor: 'text-gray-600',
    trendUp: 'text-emerald-600',
    trendDown: 'text-rose-600',
  },
};

export default function StatCard({ title, value, subtitle, icon, trend, color }: StatCardProps) {
  const colors = colorClasses[color];

  return (
    <div className={`${colors.bg} ${colors.border} border rounded-xl p-5 transition-all duration-200 hover:shadow-md`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && (
            <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span className={trend.isPositive ? colors.trendUp : colors.trendDown}>
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-gray-400">vs mes pasado</span>
            </div>
          )}
        </div>
        <div className={`${colors.iconBg} ${colors.iconColor} p-3 rounded-xl`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
