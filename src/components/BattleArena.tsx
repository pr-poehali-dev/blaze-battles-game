import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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

export default function BattleArena({ battleId, userId, opponentId, apiUrl, onBattleEnd, updateUser }: BattleArenaProps) {
  const [player1Hp, setPlayer1Hp] = useState(10);
  const [player2Hp, setPlayer2Hp] = useState(10);
  const [showButton, setShowButton] = useState(false);
  const [buttonClicked, setButtonClicked] = useState(false);
  const [winner, setWinner] = useState<number | null>(null);

  const isPlayer1 = userId < opponentId;
  const myHp = isPlayer1 ? player1Hp : player2Hp;
  const opponentHp = isPlayer1 ? player2Hp : player1Hp;

  useEffect(() => {
    const checkBattleState = setInterval(async () => {
      try {
        const response = await fetch(`${apiUrl}?action=battle_state&battle_id=${battleId}`);
        const data = await response.json();
        
        setPlayer1Hp(data.player1_hp);
        setPlayer2Hp(data.player2_hp);

        if (data.status === 'finished' && data.winner_id) {
          setWinner(data.winner_id);
          clearInterval(checkBattleState);
          
          if (data.winner_id === userId) {
            toast.success('Victory! +100 Money +1 Spin');
            updateUser({ 
              wins: (updateUser as any).wins + 1,
              money: (updateUser as any).money + 100,
              spins: (updateUser as any).spins + 1
            });
          } else {
            toast.error('Defeat! Better luck next time');
            updateUser({ losses: (updateUser as any).losses + 1 });
          }

          setTimeout(onBattleEnd, 3000);
        }
      } catch (error) {
        console.error('Battle state error:', error);
      }
    }, 1000);

    return () => clearInterval(checkBattleState);
  }, [battleId, apiUrl, userId, updateUser, onBattleEnd]);

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
        setPlayer1Hp(data.player1_hp);
        setPlayer2Hp(data.player2_hp);
        toast.success('Hit! -2 HP');
      }
    } catch (error) {
      console.error('Attack error:', error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-red-950/20 to-background relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.1)_0%,transparent_100%)] animate-pulse"></div>

      <Card className="w-full max-w-4xl p-8 bg-card/50 backdrop-blur-xl neon-border relative z-10">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-black neon-text mb-2">BATTLE ARENA</h2>
          <p className="text-muted-foreground uppercase text-sm tracking-wider">First to 0 HP loses</p>
        </div>

        <div className="grid grid-cols-2 gap-8 mb-8">
          <div className={`space-y-4 ${myHp <= 0 ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center border-2 border-primary neon-glow">
                  <Icon name="User" size={24} className="text-primary" />
                </div>
                <div>
                  <p className="font-bold text-primary">YOU</p>
                  <p className="text-xs text-muted-foreground">Player {userId}</p>
                </div>
              </div>
              <div className="text-3xl font-black text-primary">{myHp} HP</div>
            </div>
            <Progress value={(myHp / 10) * 100} className="h-4 bg-muted" />
          </div>

          <div className={`space-y-4 ${opponentHp <= 0 ? 'opacity-50' : ''}`}>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-black text-secondary">{opponentHp} HP</div>
              <div className="flex items-center gap-3">
                <div>
                  <p className="font-bold text-secondary text-right">OPPONENT</p>
                  <p className="text-xs text-muted-foreground text-right">Player {opponentId}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center border-2 border-secondary neon-glow">
                  <Icon name="Bot" size={24} className="text-secondary" />
                </div>
              </div>
            </div>
            <Progress value={(opponentHp / 10) * 100} className="h-4 bg-muted" />
          </div>
        </div>

        <div className="flex justify-center">
          {!winner && showButton && !buttonClicked && (
            <Button
              onClick={handleAttack}
              size="lg"
              className="h-32 w-32 rounded-full text-2xl font-black bg-gradient-to-r from-destructive to-orange-500 hover:scale-110 transition-all neon-glow animate-pulse"
            >
              <Icon name="Zap" size={48} />
            </Button>
          )}

          {winner && (
            <div className="text-center space-y-4">
              {winner === userId ? (
                <>
                  <Icon name="Trophy" size={64} className="text-yellow-400 mx-auto animate-bounce" />
                  <h3 className="text-3xl font-black text-yellow-400 neon-text">VICTORY!</h3>
                  <p className="text-muted-foreground">+100 Money • +1 Spin</p>
                </>
              ) : (
                <>
                  <Icon name="X" size={64} className="text-destructive mx-auto" />
                  <h3 className="text-3xl font-black text-destructive">DEFEAT</h3>
                  <p className="text-muted-foreground">Better luck next time</p>
                </>
              )}
            </div>
          )}

          {!showButton && !winner && (
            <div className="text-center text-muted-foreground animate-pulse">
              <Icon name="Clock" size={32} className="mx-auto mb-2" />
              <p className="text-sm uppercase tracking-wider">Waiting for next round...</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
