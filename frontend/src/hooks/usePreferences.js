import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';

export function usePreferences(userId = '00000000-0000-0000-0000-000000000000') {
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchPreferences = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 is not found
      setPreferences(data || { theme: 'system', language: 'en', notifications: {} });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreferences();
  }, [userId]);

  const savePreferences = async (newPrefs) => {
    const { data, error } = await supabase
      .from('user_preferences')
      .upsert({ user_id: userId, ...newPrefs })
      .select();
    if (error) throw error;
    setPreferences(data[0]);
    return data[0];
  };

  return { preferences, loading, error, savePreferences };
}
