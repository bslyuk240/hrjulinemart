import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { getAllEmployees } from '../../services/employeeService';
import ResignationList from './ResignationList';
import Loading from '../common/Loading';

export default function Resignation() {
  const { showError } = useApp();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    const result = await getAllEmployees();
    
    if (result.success) {
      setEmployees(result.data);
    } else {
      showError(result.error || 'Failed to fetch employees');
    }
    setLoading(false);
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-gray-50">
      <ResignationList employees={employees} />
    </div>
  );
}