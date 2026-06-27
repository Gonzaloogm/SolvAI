import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

export function useActivityLog(userId = '00000000-0000-0000-0000-000000000000') {
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('activity_log')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      setActivity(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
    
    const channel = supabase
      .channel('activity-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity_log' }, () => {
        fetchActivity();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { activity, loading, error, refetch: fetchActivity };
}
