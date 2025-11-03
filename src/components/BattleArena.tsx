import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import type { User } from '@/pages/Index';

interface BattleArenaProps {
  battleId: number;
  userId: number;
  opponentId: number;
  apiUrl: string;
  onBattleEnd: () => void;
  updateUser: (updates: Partial<User>) => void;
}

interface Power {
  id: number;
  name: string;
  power_type: string;
  cooldown: number;
  damage: number;
  shield_duration: number;
}

interface BattleState {
  player1_hp: number;
  player2_hp: number;
  player1_shield_until: number;
  player2_shield_until: number;
  player1_counter_until: number;
  player2_counter_until: number;
  status: string;
  winner_id?: number;
}

export default function BattleArena({ battleId, userId, opponentId, apiUrl, onBattleEnd, updateUser }: BattleArenaProps) {
  const [battleState, setBattleState] = useState<BattleState>({
    player1_hp: 10,
    player2_hp: 10,
    player1_shield_until: 0,
    player2_shield_until: 0,
    player1_counter_until: 0,
    player2_counter_until: 0,
    status: 'active',
  });
  
  const [showButton, setShowButton] = useState(false);
  const [buttonClicked, setButtonClicked] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);
  const [powers, setPowers] = useState<Power[]>([]);
  const [cooldowns, setCooldowns] = useState<Record<number, number>>({});

  const isPlayer1 = userId < opponentId;
  const myHp = isPlayer1 ? battleState.player1_hp : battleState.player2_hp;
  const opponentHp = isPlayer1 ? battleState.player2_hp : battleState.player1_hp;
  const myShieldUntil = isPlayer1 ? battleState.player1_shield_until : battleState.player2_shield_until;
  const myCounterUntil = isPlayer1 ? battleState.player1_counter_until : battleState.player2_counter_until;
  const opponentShieldUntil = isPlayer1 ? battleState.player2_shield_until : battleState.player1_shield_until;
  const opponentCounterUntil = isPlayer1 ? battleState.player2_counter_until : battleState.player1_counter_until;

  const now = Date.now();
  const hasShield = myShieldUntil > now;
  const hasCounter = myCounterUntil > now;
  const opponentHasShield = opponentShieldUntil > now;
  const opponentHasCounter = opponentCounterUntil > now;

  useEffect(() => {
    const fetchPowers = async () => {
      try {
        const response = await fetch(`${apiUrl}?action=get_user_powers&user_id=${userId}`);
        const data = await response.json();
        if (data.success) {
          setPowers(data.powers || []);
        }
      } catch (error) {
        console.error('Fetch powers error:', error);
      }
    };

    fetchPowers();
  }, [apiUrl, userId]);

  useEffect(() => {
    const checkBattleState = setInterval(async () => {
      try {
        const response = await fetch(`${apiUrl}?action=battle_state&battle_id=${battleId}`);
        const data = await response.json();
        
        setBattleState(data);

        if (data.status === 'finished' && data.winner_id) {
          setWinner(data.winner_id);
          clearInterval(checkBattleState);
          
          if (data.winner_id === userId) {
            toast.success('Victory! +100 Money +1 Spin');
          } else {
            toast.error('Defeat! Better luck next time');
          }

          setTimeout(onBattleEnd, 3000);
        }
      } catch (error) {
        console.error('Battle state error:', error);
      }
    }, 1000);

    return () => clearInterval(checkBattleState);
  }, [battleId, apiUrl, userId, onBattleEnd]);

  useEffect(() => {
    if (winner) return;

    const showButtonInterval = setInterval(() => {
      setShowButton(true);
      setButtonClicked(false);

      setTimeout(() => {
        setShowButton(false);
      }, 2000);
    }, 3000);

    return () => clearInterval(showButtonInterval);
  }, [winner]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCooldowns((prev) => {
        const updated = { ...prev };
        let changed = false;
        for (const powerId in updated) {
          if (updated[powerId] <= Date.now()) {
            delete updated[powerId];
            changed = true;
          }
        }
        return changed ? updated : prev;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const handleAttack = async () => {
    if (buttonClicked) return;
    setButtonClicked(true);
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'attack',
          user_id: userId,
          battle_id: battleId,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        if (data.blocked) {
          toast.warning(data.message);
        } else if (data.countered) {
          toast.error(`Countered! You took ${data.damage_taken} damage!`);
        } else {
          toast.success('Hit! -2 HP');
        }
        
        setBattleState((prev) => ({
          ...prev,
          player1_hp: data.player1_hp,
          player2_hp: data.player2_hp,
        }));

        if (data.finished && data.winner_id) {
          setWinner(data.winner_id);
          setTimeout(onBattleEnd, 3000);
        }
      }
    } catch (error) {
      console.error('Attack error:', error);
      toast.error('Attack failed');
    }
  };

  const handlePowerUse = async (power: Power) => {
    const onCooldown = cooldowns[power.id] && cooldowns[power.id] > Date.now();
    if (onCooldown) {
      toast.error('Power on cooldown!');
      return;
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'use_power',
          user_id: userId,
          battle_id: battleId,
          power_id: power.id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || `Used ${power.name}!`);
        
        if (data.player1_hp !== undefined) {
          setBattleState((prev) => ({
            ...prev,
            player1_hp: data.player1_hp,
            player2_hp: data.player2_hp,
          }));
        }

        setCooldowns((prev) => ({
          ...prev,
          [power.id]: Date.now() + power.cooldown * 1000,
        }));

        if (data.finished && data.winner_id) {
          setWinner(data.winner_id);
          setTimeout(onBattleEnd, 3000);
        }
      } else {
        toast.error(data.error || 'Power use failed');
      }
    } catch (error) {
      console.error('Power use error:', error);
      toast.error('Connection error');
    }
  };

  const getPowerTypeColor = (type: string) => {
    switch (type) {
      case 'attack': return 'bg-red-500';
      case 'defense': return 'bg-blue-500';
      case 'counter': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  const getPowerTypeIcon = (type: string) => {
    switch (type) {
      case 'attack': return 'Sword';
      case 'defense': return 'Shield';
      case 'counter': return 'Zap';
      default: return 'Sparkles';
    }
  };

  if (winner) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-purple-950/20 to-background">
        <Card className="p-12 text-center max-w-md bg-card/50 backdrop-blur-xl neon-border">
          {winner === userId ? (
            <>
              <Icon name="Trophy" size={80} className="text-yellow-400 mx-auto mb-6 animate-bounce" />
              <h2 className="text-4xl font-black neon-text mb-4">VICTORY!</h2>
              <p className="text-muted-foreground mb-2">You defeated your opponent!</p>
              <p className="text-xl text-primary font-bold">+100 Money +1 Spin</p>
            </>
          ) : (
            <>
              <Icon name="X" size={80} className="text-red-500 mx-auto mb-6" />
              <h2 className="text-4xl font-black text-red-500 mb-4">DEFEAT</h2>
              <p className="text-muted-foreground">Better luck next time!</p>
            </>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-background via-purple-950/20 to-background">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <Card className={`p-6 bg-card/50 backdrop-blur-sm ${isPlayer1 ? 'border-primary/50' : 'border-accent/30'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold mb-1">YOU</h3>
                <div className="flex gap-2">
                  {hasShield && (
                    <Badge className="bg-blue-500 text-white">
                      <Icon name="Shield" size={14} className="mr-1" />
                      Shield
                    </Badge>
                  )}
                  {hasCounter && (
                    <Badge className="bg-purple-500 text-white">
                      <Icon name="Zap" size={14} className="mr-1" />
                      Counter
                    </Badge>
                  )}
                </div>
              </div>
              <Icon name="User" size={48} className={isPlayer1 ? 'text-primary' : 'text-accent'} />
            </div>
            <div className="mb-2">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-bold">HP</span>
                <span className="text-sm font-bold">{myHp}/10</span>
              </div>
              <Progress value={(myHp / 10) * 100} className="h-6" />
            </div>
          </Card>

          <Card className={`p-6 bg-card/50 backdrop-blur-sm ${!isPlayer1 ? 'border-primary/50' : 'border-accent/30'}`}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-2xl font-bold mb-1">OPPONENT</h3>
                <div className="flex gap-2">
                  {opponentHasShield && (
                    <Badge className="bg-blue-500 text-white">
                      <Icon name="Shield" size={14} className="mr-1" />
                      Shield
                    </Badge>
                  )}
                  {opponentHasCounter && (
                    <Badge className="bg-purple-500 text-white">
                      <Icon name="Zap" size={14} className="mr-1" />
                      Counter
                    </Badge>
                  )}
                </div>
              </div>
              <Icon name="User" size={48} className={!isPlayer1 ? 'text-primary' : 'text-accent'} />
            </div>
            <div className="mb-2">
              <div className="flex justify-between mb-1">
                <span className="text-sm font-bold">HP</span>
                <span className="text-sm font-bold">{opponentHp}/10</span>
              </div>
              <Progress value={(opponentHp / 10) * 100} className="h-6" />
            </div>
          </Card>
        </div>

        <Card className="p-8 bg-card/50 backdrop-blur-sm text-center mb-6">
          {showButton && !buttonClicked ? (
            <Button
              onClick={handleAttack}
              size="lg"
              className="h-24 w-64 text-3xl font-black bg-gradient-to-r from-primary to-secondary hover:scale-110 transition-all neon-glow animate-pulse"
            >
              <Icon name="Swords" size={40} className="mr-4" />
              ATTACK!
            </Button>
          ) : (
            <div className="py-8">
              <p className="text-xl text-muted-foreground">
                {buttonClicked ? 'Attack sent!' : 'Wait for button...'}
              </p>
            </div>
          )}
        </Card>

        {powers.length > 0 && (
          <Card className="p-6 bg-card/50 backdrop-blur-sm">
            <h3 className="text-xl font-bold mb-4">YOUR POWERS</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {powers.map((power) => {
                const onCooldown = cooldowns[power.id] && cooldowns[power.id] > Date.now();
                const remainingCd = onCooldown ? Math.ceil((cooldowns[power.id] - Date.now()) / 1000) : 0;

                return (
                  <Button
                    key={power.id}
                    onClick={() => handlePowerUse(power)}
                    disabled={onCooldown}
                    variant="outline"
                    className={`h-auto flex flex-col items-start p-4 ${getPowerTypeColor(power.power_type)} ${onCooldown ? 'opacity-50' : 'hover:scale-105'}`}
                  >
                    <div className="flex items-center gap-2 mb-2 w-full">
                      <Icon name={getPowerTypeIcon(power.power_type)} size={20} />
                      <span className="font-bold text-sm">{power.name}</span>
                    </div>
                    <span className="text-xs text-white/80">
                      {power.power_type === 'attack' && `${power.damage} DMG`}
                      {power.power_type === 'defense' && `${power.shield_duration}s Shield`}
                      {power.power_type === 'counter' && `${power.damage} Counter`}
                    </span>
                    {onCooldown && (
                      <span className="text-xs text-white font-bold mt-1">CD: {remainingCd}s</span>
                    )}
                  </Button>
                );
              })}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
