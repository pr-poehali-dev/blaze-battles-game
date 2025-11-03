import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import Icon from '@/components/ui/icon';
import PowersCatalog from './PowersCatalog';
import InventoryScreen from './InventoryScreen';
import SpinScreen from './SpinScreen';
import type { User } from '@/pages/Index';

interface PowersPageProps {
  user: User;
  apiUrl: string;
  onBack: () => void;
  updateUser: (updates: Partial<User>) => void;
}

type ViewMode = 'menu' | 'catalog' | 'inventory' | 'spin';

export default function PowersPage({ user, apiUrl, onBack, updateUser }: PowersPageProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('menu');

  if (viewMode === 'catalog') {
    return <PowersCatalog apiUrl={apiUrl} onBack={() => setViewMode('menu')} />;
  }

  if (viewMode === 'inventory') {
    return <InventoryScreen userId={user.id} apiUrl={apiUrl} onBack={() => setViewMode('menu')} />;
  }

  if (viewMode === 'spin') {
    return (
      <SpinScreen
        userId={user.id}
        spins={user.spins}
        apiUrl={apiUrl}
        onBack={() => setViewMode('menu')}
        updateUser={updateUser}
      />
    );
  }

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-background via-purple-950/10 to-background flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black neon-text mb-2">POWERS PAGE</h1>
            <p className="text-muted-foreground text-sm uppercase tracking-wider">
              Manage your abilities
            </p>
          </div>
          <Button onClick={onBack} variant="outline" className="border-primary/40">
            <Icon name="ArrowLeft" size={16} className="mr-2" />
            Back to Game
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card
            onClick={() => setViewMode('catalog')}
            className="p-8 bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/50 transition-all hover:scale-105 cursor-pointer text-center"
          >
            <Icon name="Book" size={48} className="text-primary mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Powers Catalog</h3>
            <p className="text-sm text-muted-foreground">Browse all available powers</p>
          </Card>

          <Card
            onClick={() => setViewMode('inventory')}
            className="p-8 bg-card/50 backdrop-blur-sm border-accent/20 hover:border-accent/50 transition-all hover:scale-105 cursor-pointer text-center"
          >
            <Icon name="Package" size={48} className="text-accent mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Inventory</h3>
            <p className="text-sm text-muted-foreground">View your collected powers</p>
          </Card>

          <Card
            onClick={() => setViewMode('spin')}
            className="p-8 bg-card/50 backdrop-blur-sm border-secondary/20 hover:border-secondary/50 transition-all hover:scale-105 cursor-pointer text-center"
          >
            <Icon name="Sparkles" size={48} className="text-secondary mx-auto mb-4" />
            <h3 className="text-xl font-bold mb-2">Spin Roulette</h3>
            <p className="text-sm text-muted-foreground">Use spins: {user.spins}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
