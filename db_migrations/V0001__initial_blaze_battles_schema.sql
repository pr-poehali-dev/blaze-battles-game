-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    nick VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    money INTEGER DEFAULT 0,
    spins INTEGER DEFAULT 0,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Powers catalog table
CREATE TABLE IF NOT EXISTS powers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    rarity VARCHAR(20) NOT NULL CHECK (rarity IN ('Common', 'Rare', 'Epic', 'Legendary')),
    drop_chance DECIMAL(5,2) NOT NULL,
    effect VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User inventory table
CREATE TABLE IF NOT EXISTS user_powers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    power_id INTEGER REFERENCES powers(id),
    obtained_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, power_id)
);

-- Matchmaking queue table
CREATE TABLE IF NOT EXISTS matchmaking_queue (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'expired'))
);

-- Active battles table
CREATE TABLE IF NOT EXISTS battles (
    id SERIAL PRIMARY KEY,
    player1_id INTEGER REFERENCES users(id),
    player2_id INTEGER REFERENCES users(id),
    player1_hp INTEGER DEFAULT 10,
    player2_hp INTEGER DEFAULT 10,
    current_turn INTEGER DEFAULT 1,
    button_expires_at TIMESTAMP,
    winner_id INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'finished')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP
);

-- Insert default powers
INSERT INTO powers (name, rarity, drop_chance, effect) VALUES
('Fire Blast', 'Common', 40.00, 'Deal 3 damage'),
('Ice Shield', 'Common', 30.00, 'Block 2 damage next turn'),
('Lightning Strike', 'Rare', 20.00, 'Deal 5 damage'),
('Heal Wave', 'Rare', 15.00, 'Restore 4 HP'),
('Shadow Step', 'Epic', 8.00, 'Dodge next attack'),
('Meteor Rain', 'Epic', 5.00, 'Deal 7 damage'),
('Divine Protection', 'Legendary', 1.50, 'Become invincible for 1 turn'),
('Cosmic Annihilation', 'Legendary', 0.50, 'Deal 10 damage');

-- Create indexes for performance
CREATE INDEX idx_matchmaking_status ON matchmaking_queue(status, joined_at);
CREATE INDEX idx_battles_status ON battles(status);
CREATE INDEX idx_user_powers_user ON user_powers(user_id);