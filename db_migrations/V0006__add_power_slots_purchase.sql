-- Add columns to track which power slots users have unlocked
ALTER TABLE users ADD COLUMN IF NOT EXISTS slot2_unlocked BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS slot3_unlocked BOOLEAN DEFAULT FALSE;

-- All users start with slot 1 unlocked by default
COMMENT ON COLUMN users.slot2_unlocked IS 'Whether user has purchased slot 2 for 1000 coins';
COMMENT ON COLUMN users.slot3_unlocked IS 'Whether user has purchased slot 3 for 2000 coins';