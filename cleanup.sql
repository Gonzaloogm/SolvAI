ALTER TABLE solvency_reports ADD COLUMN IF NOT EXISTS pdf_unlocked BOOLEAN DEFAULT FALSE;
ALTER TABLE solvency_reports ADD COLUMN IF NOT EXISTS pdf_unlocked_at TIMESTAMPTZ;
ALTER TABLE solvency_reports ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;

DELETE FROM solvency_reports WHERE status = 'FAILED' AND overall_score IS NULL AND created_at < NOW() - INTERVAL '24 hours';
DELETE FROM solvency_reports WHERE status = 'GENERATING' AND created_at < NOW() - INTERVAL '2 hours';

UPDATE organizations SET plan = 'pro', status = 'active', current_period_end = '2099-12-31'::date WHERE id IN (SELECT organization_id FROM users WHERE email IN ('demo@solvai.com', 'gongarmart@gmail.com'));

INSERT INTO promo_codes (code, plan, max_uses, is_active) VALUES ('SOLVAI-FOUNDER', 'pro', 100, true), ('HACKATHON2026', 'pro', 50, true), ('BETA-ACCESS', 'pro', 25, true) ON CONFLICT (code) DO UPDATE SET is_active=true, uses_count=0;
