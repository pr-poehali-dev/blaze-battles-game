import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import type { User } from '@/pages/Index';
import MatchmakingScreen from './MatchmakingScreen';
import BattleArena from './BattleArena';
import PowersCatalog from './PowersCatalog';
import InventoryScreen from './InventoryScreen';
import SpinScreen from './SpinScreen';

interface GameDashboardProps {
  user: User;
  onLogout: () => void;
  updateUser: (updates: Partial<User>) => void;
  apiUrls: {
    auth: string;
    game: string;
    powers: string;
  };
}

type Screen = 'home' | 'matchmaking' | 'battle' | 'powers' | 'inventory' | 'spin';

export default function GameDashboard({ user, onLogout, updateUser, apiUrls }: GameDashboardProps) {
  const [screen, setScreen] = useState<Screen>('home');
  const [battleId, setBattleId] = useState<number | null>(null);
  const [opponentId, setOpponentId] = useState<number | null>(null);

  const handleMatchFound = (matchBattleId: number, matchOpponentId: number) => {
    setBattleId(matchBattleId);
    setOpponentId(matchOpponentId);
    setScreen('battle');
  };

  const handleBattleEnd = () => {
    setBattleId(null);
    setOpponentId(null);
    setScreen('home');
  };

  if (screen === 'matchmaking') {
    return (
      <MatchmakingScreen
        userId={user.id}
        apiUrl={apiUrls.game}
        onMatchFound={handleMatchFound}
        onCancel={() => {
          setScreen('home');
          updateUser({ money: user.money + 10 });
        }}
      />
    );
  }

  if (screen === 'battle' && battleId && opponentId) {
    return (
      <BattleArena
        battleId={battleId}
        userId={user.id}
        opponentId={opponentId}
        apiUrl={apiUrls.game}
        onBattleEnd={handleBattleEnd}
        updateUser={updateUser}
      />
    );
  }

  if (screen === 'powers') {
    return <PowersCatalog apiUrl={apiUrls.powers} onBack={() => setScreen('home')} />;
  }

  if (screen === 'inventory') {
    return <InventoryScreen userId={user.id} apiUrl={apiUrls.powers} onBack={() => setScreen('home')} />;
  }

  if (screen === 'spin') {
    return (
      <SpinScreen
        userId={user.id}
        spins={user.spins}
        apiUrl={apiUrls.powers}
        onBack={() => setScreen('home')}
        updateUser={updateUser}
      />
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-background via-purple-950/10 to-background">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-black neon-text mb-1">BLAZE BATTLES</h1>
            <p className="text-muted-foreground text-sm">Player: <span className="text-primary font-bold">{user.nick}</span></p>
          </div>
          <Button onClick={onLogout} variant="outline" className="border-destructive/50 hover:bg-destructive/10">
            <Icon name="LogOut" size={16} className="mr-2" />
            Exit
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="p-4 bg-card/50 backdrop-blur-sm border-primary/30">
            <div className="flex items-center gap-3">
              <Icon name="Coins" size={24} className="text-yellow-400" />
              <div>
                <p className="text-xs text-muted-foreground uppercase">Money</p>
                <p className="text-2xl font-bold text-yellow-400">{user.money}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-card/50 backdrop-blur-sm border-secondary/30">
            <div className="flex items-center gap-3">
              <Icon name="Sparkles" size={24} className="text-secondary" />
              <div>
                <p className="text-xs text-muted-foreground uppercase">Spins</p>
                <p className="text-2xl font-bold text-secondary">{user.spins}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4 bg-card/50 backdrop-blur-sm border-accent/30">
            <div className="flex items-center gap-3">
              <Icon name="Trophy" size={24} className="text-accent" />
              <div>
                <p className="text-xs text-muted-foreground uppercase">W/L</p>
                <p className="text-2xl font-bold text-accent">{user.wins}/{user.losses}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Button
            onClick={() => setScreen('matchmaking')}
            className="w-full h-20 text-2xl font-black bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_100%] hover:bg-[position:100%_0] transition-all duration-500 neon-glow"
          >
            <Icon name="Swords" size={32} className="mr-4" />
            FIND OPPONENT
          </Button>

          <div className="grid grid-cols-3 gap-4">
            <Button
              onClick={() => setScreen('powers')}
              variant="outline"
              className="h-16 flex flex-col items-center justify-center border-primary/40 hover:bg-primary/10"
            >
              <Icon name="Zap" size={24} className="mb-1" />
              <span className="text-xs uppercase">Powers</span>
            </Button>

            <Button
              onClick={() => setScreen('inventory')}
              variant="outline"
              className="h-16 flex flex-col items-center justify-center border-accent/40 hover:bg-accent/10"
            >
              <Icon name="Package" size={24} className="mb-1" />
              <span className="text-xs uppercase">Inventory</span>
            </Button>

            <Button
              onClick={() => setScreen('spin')}
              variant="outline"
              className="h-16 flex flex-col items-center justify-center border-secondary/40 hover:bg-secondary/10"
            >
              <Icon name="Sparkles" size={24} className="mb-1" />
              <span className="text-xs uppercase">Spin</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
