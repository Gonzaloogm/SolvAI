INSERT INTO promo_codes 
  (code, plan, max_uses, is_active)
VALUES
  ('SOLVAI-FOUNDER', 'pro', 100, true),
  ('HACKATHON2026', 'pro', 50, true),
  ('BETA-ACCESS', 'pro', 25, true),
  ('LANDLORD-PRO', 'pro', 20, true),
  ('GESTOR-PRO', 'pro', 20, true)
ON CONFLICT (code) DO UPDATE 
  SET is_active = true, 
      uses_count = 0,
      max_uses = EXCLUDED.max_uses;

SELECT code, plan, max_uses, uses_count, is_active 
FROM promo_codes;
