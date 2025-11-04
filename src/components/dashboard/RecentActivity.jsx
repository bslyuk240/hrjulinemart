import React, { useState } from 'react';
import { FileText, UserPlus, Clock } from 'lucide-react';

export default function RecentActivity({ recentPayrolls, recentEmployees, formatCurrency, formatDate }) {
  const [activeTab, setActiveTab] = useState('payrolls');

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('payrolls')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'payrolls'
                ? 'bg-purple-100 text-purple-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Payrolls
          </button>
          <button
            onClick={() => setActiveTab('employees')}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'employees'
                ? 'bg-purple-100 text-purple-700'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Employees
          </button>
        </div>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {activeTab === 'payrolls' ? (
          recentPayrolls.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No recent payroll records</p>
            </div>
          ) : (
            recentPayrolls.map((payroll) => (
              <div key={payroll.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="bg-green-100 p-2 rounded-lg">
                  <FileText className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{payroll.employee_name}</p>
                  <p className="text-sm text-gray-600">
                    {payroll.month} {payroll.year} • {formatCurrency(payroll.net_salary)}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(payroll.generated_date)}
                  </div>
                </div>
              </div>
            ))
          )
        ) : (
          recentEmployees.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <UserPlus className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No recent employees</p>
            </div>
          ) : (
            recentEmployees.map((employee) => (
              <div key={employee.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="bg-blue-100 p-2 rounded-lg">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{employee.name}</p>
                  <p className="text-sm text-gray-600 truncate">
                    {employee.position || 'N/A'} • {employee.department || 'N/A'}
                  </p>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
                    <Clock className="w-3 h-3" />
                    Joined {formatDate(employee.join_date)}
                  </div>
                </div>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
}