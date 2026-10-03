-- Password and OAuth accounts are intentionally exclusive. Existing accounts
-- with both methods remain password accounts; remove their OAuth links.
DELETE FROM oauth_accounts
WHERE user_id IN (
  SELECT id FROM users WHERE password_hash IS NOT NULL
);
