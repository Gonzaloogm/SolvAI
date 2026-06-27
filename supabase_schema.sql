-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  status text DEFAULT 'Processing',
  data_source text,
  model text,
  accuracy numeric,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE data_sources (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL,
  status text DEFAULT 'Connected',
  last_sync timestamptz DEFAULT now(),
  records_count integer DEFAULT 0,
  config jsonb DEFAULT '{}'
);

CREATE TABLE user_preferences (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  theme text DEFAULT 'system',
  language text DEFAULT 'en',
  notifications jsonb DEFAULT '{"reportCompleted":true, "dataSourceErrors":true, "weeklyDigest":true, "productUpdates":true, "marketingEmails":false}'
);

CREATE TABLE activity_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Row Level Security
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own data" ON reports
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own data" ON data_sources
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own data" ON user_preferences
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users see own data" ON activity_log
  FOR ALL USING (auth.uid() = user_id);
