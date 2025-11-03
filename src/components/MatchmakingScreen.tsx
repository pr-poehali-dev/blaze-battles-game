import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import Icon from '@/components/ui/icon';

interface MatchmakingScreenProps {
  userId: number;
  apiUrl: string;
  onMatchFound: (battleId: number, opponentId: number) => void;
  onCancel: () => void;
}

export default function MatchmakingScreen({ userId, apiUrl, onMatchFound, onCancel }: MatchmakingScreenProps) {
  const [seconds, setSeconds] = useState(0);
  const maxSeconds = 20;

  useEffect(() => {
    const startSearch = async () => {
      try {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'find_match', user_id: userId }),
        });
        const data = await response.json();
        
        if (data.matched && data.battle_id) {
          onMatchFound(data.battle_id, data.opponent_id);
        }
      } catch (error) {
        console.error('Matchmaking error:', error);
      }
    };

    startSearch();

    const timer = setInterval(() => {
      setSeconds((prev) => {
        if (prev >= maxSeconds) {
          clearInterval(timer);
          return maxSeconds;
        }
        return prev + 1;
      });
    }, 1000);

    const checkMatch = setInterval(async () => {
      try {
        const response = await fetch(`${apiUrl}?action=check_match&user_id=${userId}`);
        const data = await response.json();
        
        if (data.matched && data.battle_id) {
          clearInterval(checkMatch);
          clearInterval(timer);
          onMatchFound(data.battle_id, data.player1_id === userId ? data.player2_id : data.player1_id);
        }
      } catch (error) {
        console.error('Check match error:', error);
      }
    }, 2000);

    return () => {
      clearInterval(timer);
      clearInterval(checkMatch);
    };
  }, [userId, apiUrl, onMatchFound]);

  useEffect(() => {
    if (seconds >= maxSeconds) {
      const cancelSearch = async () => {
        await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'cancel_search', user_id: userId }),
        });
        onCancel();
      };
      cancelSearch();
    }
  }, [seconds, maxSeconds, apiUrl, userId, onCancel]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-purple-950/20 to-background">
      <Card className="w-full max-w-lg p-8 bg-card/50 backdrop-blur-xl neon-border">
        <div className="text-center space-y-6">
          <div className="inline-block p-6 rounded-full bg-primary/10 neon-glow animate-pulse">
            <Icon name="Search" size={48} className="text-primary" />
          </div>

          <h2 className="text-3xl font-black neon-text uppercase">Searching for Opponent</h2>

          <div className="space-y-3">
            <Progress value={(seconds / maxSeconds) * 100} className="h-3" />
            <p className="text-lg font-mono text-muted-foreground">
              {seconds} / {maxSeconds} seconds
            </p>
          </div>

          <div className="flex gap-2 items-center justify-center text-primary animate-pulse">
            <div className="w-3 h-3 rounded-full bg-primary animate-bounce"></div>
            <div className="w-3 h-3 rounded-full bg-primary animate-bounce delay-100"></div>
            <div className="w-3 h-3 rounded-full bg-primary animate-bounce delay-200"></div>
          </div>

          <Button
            onClick={onCancel}
            variant="outline"
            className="border-destructive/50 hover:bg-destructive/10"
          >
            Cancel Search (+10 Money)
          </Button>
        </div>
      </Card>
    </div>
  );
}
