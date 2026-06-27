import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

export function useReports(userId = '00000000-0000-0000-0000-000000000000') {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchReports = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setReports(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
    
    const channel = supabase
      .channel('reports-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
        fetchReports();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const createReport = async (reportData) => {
    const { data, error } = await supabase
      .from('reports')
      .insert([{ ...reportData, user_id: userId }])
      .select();
    if (error) throw error;
    return data[0];
  };

  const deleteReport = async (id) => {
    const { error } = await supabase.from('reports').delete().eq('id', id);
    if (error) throw error;
  };

  return { reports, loading, error, refetch: fetchReports, createReport, deleteReport };
}
