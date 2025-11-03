-- Add equipped slots for users (3 slots for powers)
ALTER TABLE user_powers ADD COLUMN IF NOT EXISTS equipped_slot INTEGER DEFAULT NULL;
ALTER TABLE user_powers ADD CONSTRAINT unique_equipped_slot UNIQUE (user_id, equipped_slot);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_powers_equipped ON user_powers(user_id, equipped_slot) WHERE equipped_slot IS NOT NULL;

COMMENT ON COLUMN user_powers.equipped_slot IS 'Slot number 1-3 for equipped powers, NULL if not equipped';