UPDATE organizations 
SET plan = 'pro',
    status = 'active',
    current_period_end = '2099-12-31 23:59:59'
WHERE id = (
  SELECT organization_id FROM users 
  WHERE email = 'demo@solvai.com'
);

UPDATE organizations 
SET plan = 'pro',
    status = 'active', 
    current_period_end = '2099-12-31 23:59:59'
WHERE id IN (
  SELECT organization_id FROM users 
  WHERE email LIKE 'beta%@solvai.com'
);

SELECT u.email, o.plan, o.status, o.current_period_end
FROM users u 
JOIN organizations o ON u.organization_id = o.id
WHERE u.email IN (
  'demo@solvai.com',
  'beta1@solvai.com',
  'beta2@solvai.com'
);
