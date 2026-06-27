import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

export function useDataSources(userId = '00000000-0000-0000-0000-000000000000') {
  const [dataSources, setDataSources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDataSources = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('data_sources')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setDataSources(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDataSources();
    
    const channel = supabase
      .channel('sources-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'data_sources' }, () => {
        fetchDataSources();
      })
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const connectSource = async (sourceData) => {
    const { data, error } = await supabase
      .from('data_sources')
      .insert([{ ...sourceData, user_id: userId }])
      .select();
    if (error) throw error;
    return data[0];
  };

  const disconnectSource = async (id) => {
    const { error } = await supabase.from('data_sources').delete().eq('id', id);
    if (error) throw error;
  };
  
  const syncSource = async (id) => {
    // Set syncing
    await supabase.from('data_sources').update({ status: 'Syncing' }).eq('id', id);
    // Simulate Edge function delay
    await new Promise(r => setTimeout(r, 2000));
    // Set connected and records
    const { data, error } = await supabase
      .from('data_sources')
      .update({ status: 'Connected', last_sync: new Date().toISOString(), records_count: Math.floor(Math.random() * 500) })
      .eq('id', id)
      .select();
    if (error) throw error;
    return data[0];
  };

  return { dataSources, loading, error, refetch: fetchDataSources, connectSource, disconnectSource, syncSource };
}
