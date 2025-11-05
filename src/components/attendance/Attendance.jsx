import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { getAllEmployees } from '../../services/employeeService';
import AttendanceList from './AttendanceList';
import Loading from '../common/Loading';

export default function Attendance() {
  const { showError } = useApp();
  const { user, isAdmin, isManager } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    const result = await getAllEmployees();
    
    if (result.success) {
      let employeesData = result.data;

      // If regular employee, only fetch their own data
      if (!isAdmin() && !isManager()) {
        employeesData = employeesData.filter(emp => emp.id === user.id);
      }

      setEmployees(employeesData);
    } else {
      showError(result.error || 'Failed to fetch employees');
    }
    setLoading(false);
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50">
      <AttendanceList employees={employees} />
    </div>
  );
}