import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import type { User } from '@/pages/Index';
import MatchmakingScreen from './MatchmakingScreen';
import BattleArena from './BattleArena';
import PowersPage from './PowersPage';
import AdminPanel from './AdminPanel';

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

type Screen = 'home' | 'matchmaking' | 'battle' | 'powers' | 'admin';

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
    return (
      <PowersPage
        user={user}
        apiUrl={apiUrls.powers}
        onBack={() => setScreen('home')}
        updateUser={updateUser}
      />
    );
  }

  if (screen === 'admin' && user.is_admin) {
    return (
      <AdminPanel
        apiUrl={apiUrls.game}
        onBack={() => setScreen('home')}
      />
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 bg-gradient-to-br from-background via-purple-950/10 to-background">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-1/4 w-64 h-64 bg-primary/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-secondary/10 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-8 gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-black neon-text mb-1">BLAZE BATTLES</h1>
            <p className="text-muted-foreground text-xs sm:text-sm">Player: <span className="text-primary font-bold">{user.nick}</span></p>
          </div>
          <Button onClick={onLogout} variant="outline" className="border-destructive/50 hover:bg-destructive/10 w-full sm:w-auto">
            <Icon name="LogOut" size={16} className="mr-2" />
            Exit
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-6 sm:mb-8">
          <Card className="p-3 sm:p-4 bg-card/50 backdrop-blur-sm border-primary/30">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
              <Icon name="Coins" size={20} className="text-yellow-400 sm:w-6 sm:h-6" />
              <div className="text-center sm:text-left">
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase">Money</p>
                <p className="text-lg sm:text-2xl font-bold text-yellow-400">{user.money}</p>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-4 bg-card/50 backdrop-blur-sm border-secondary/30">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
              <Icon name="Sparkles" size={20} className="text-secondary sm:w-6 sm:h-6" />
              <div className="text-center sm:text-left">
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase">Spins</p>
                <p className="text-lg sm:text-2xl font-bold text-secondary">{user.spins}</p>
              </div>
            </div>
          </Card>

          <Card className="p-3 sm:p-4 bg-card/50 backdrop-blur-sm border-accent/30">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
              <Icon name="Trophy" size={20} className="text-accent sm:w-6 sm:h-6" />
              <div className="text-center sm:text-left">
                <p className="text-[10px] sm:text-xs text-muted-foreground uppercase">W/L</p>
                <p className="text-lg sm:text-2xl font-bold text-accent">{user.wins}/{user.losses}</p>
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-3 sm:space-y-4">
          <Button
            onClick={() => setScreen('matchmaking')}
            className="w-full h-16 sm:h-20 text-xl sm:text-2xl font-black bg-gradient-to-r from-primary via-secondary to-primary bg-[length:200%_100%] hover:bg-[position:100%_0] transition-all duration-500 neon-glow"
          >
            <Icon name="Swords" size={24} className="mr-2 sm:mr-4 sm:w-8 sm:h-8" />
            FIND OPPONENT
          </Button>

          <Button
            onClick={() => setScreen('powers')}
            variant="outline"
            className="w-full h-14 sm:h-16 text-base sm:text-lg font-bold border-primary/40 hover:bg-primary/10"
          >
            <Icon name="Sparkles" size={20} className="mr-2 sm:mr-3 sm:w-6 sm:h-6" />
            POWERS PAGE
          </Button>

          {user.is_admin && (
            <Button
              onClick={() => setScreen('admin')}
              variant="outline"
              className="w-full h-14 sm:h-16 text-base sm:text-lg font-bold border-red-500/40 hover:bg-red-500/10"
            >
              <Icon name="Shield" size={20} className="mr-2 sm:mr-3 sm:w-6 sm:h-6" />
              ADMIN PANEL
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}