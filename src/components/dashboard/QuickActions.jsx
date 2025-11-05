import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, DollarSign, FileText, Calendar } from 'lucide-react';

export default function QuickActions() {
  const navigate = useNavigate();

  const actions = [
    {
      title: 'Add Employee',
      description: 'Register new employee',
      icon: Users,
      color: 'purple',
      action: () => navigate('/employees'),
    },
    {
      title: 'Generate Payslip',
      description: 'Create monthly payslip',
      icon: DollarSign,
      color: 'green',
      action: () => navigate('/payroll'),
    },
    {
      title: 'View Reports',
      description: 'Access analytics',
      icon: FileText,
      color: 'blue',
      action: () => alert('Reports feature coming soon!'),
    },
    {
      title: 'Manage Leaves',
      description: 'Review leave requests',
      icon: Calendar,
      color: 'orange',
      action: () => navigate('/leave'),
    },
  ];

  const colorClasses = {
    purple: 'bg-purple-100 text-purple-600 hover:bg-purple-200',
    green: 'bg-green-100 text-green-600 hover:bg-green-200',
    blue: 'bg-blue-100 text-blue-600 hover:bg-blue-200',
    orange: 'bg-orange-100 text-orange-600 hover:bg-orange-200',
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.action}
            className={`${colorClasses[action.color]} p-4 rounded-lg transition-all text-left group`}
          >
            <action.icon className="w-8 h-8 mb-3" />
            <h3 className="font-semibold text-sm mb-1">{action.title}</h3>
            <p className="text-xs opacity-75">{action.description}</p>
          </button>
        ))}
      </div>
    </div>
  );
}