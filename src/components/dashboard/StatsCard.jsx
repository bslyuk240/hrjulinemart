import React from 'react';

export default function StatsCard({ title, value, icon: Icon, color, trend, subtitle }) {
  const colorClasses = {
    purple: 'from-purple-500 to-purple-600',
    green: 'from-green-500 to-green-600',
    blue: 'from-blue-500 to-blue-600',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600',
  };

  return (
    <div className={`bg-gradient-to-br ${colorClasses[color]} rounded-lg p-3 sm:p-6 text-white shadow-lg`}>
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-white text-opacity-90 text-xs sm:text-sm">{title}</p>
          <p className="text-xl sm:text-3xl font-bold mt-1 sm:mt-2 leading-tight">{value}</p>
          {(trend || subtitle) && (
            <p className="text-white text-opacity-80 text-[10px] sm:text-xs mt-1 sm:mt-2">
              {trend || subtitle}
            </p>
          )}
        </div>
        <div className="bg-white bg-opacity-20 p-2 sm:p-3 rounded-lg">
          <Icon className="w-5 h-5 sm:w-8 sm:h-8" />
        </div>
      </div>
    </div>
  );
}
