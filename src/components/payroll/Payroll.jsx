import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../services/supabase';
import PayrollList from './PayrollList';
import Loading from '../common/Loading';

export default function Payroll() {
  const { showError } = useApp();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        console.error('Error fetching employees:', error);
        showError('Failed to fetch employees');
        setEmployees([]);
      } else {
        setEmployees(data || []);
      }
    } catch (error) {
      console.error('Error fetching employees:', error);
      showError('Failed to fetch employees');
      setEmployees([]);
    }
    setLoading(false);
  };

  if (loading) return <Loading />;

  return <PayrollList employees={employees} />;
}