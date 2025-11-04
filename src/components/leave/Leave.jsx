import React, { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../services/supabase';
import LeaveList from './LeaveList';
import Loading from '../common/Loading';

export default function Leave() {
  const { showError } = useApp();
  const { user, isAdmin, isManager } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      let query = supabase.from('employees').select('*');

      // If regular employee, only fetch their own data
      if (!isAdmin() && !isManager()) {
        query = query.eq('id', user.id);
      }

      const { data, error } = await query.order('name', { ascending: true });
      
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

  return <LeaveList employees={employees} />;
}