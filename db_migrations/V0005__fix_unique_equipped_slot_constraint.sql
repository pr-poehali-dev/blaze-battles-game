ALTER TABLE user_powers DROP CONSTRAINT IF EXISTS unique_equipped_slot;

CREATE UNIQUE INDEX IF NOT EXISTS unique_user_equipped_slot ON user_powers(user_id, equipped_slot) WHERE equipped_slot IS NOT NULL;