import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';

interface Power {
  id: number;
  name: string;
  rarity: string;
  power_type: string;
  cooldown: number;
  damage: number;
  shield_duration: number;
}

interface PowersCatalogProps {
  apiUrl: string;
  onBack: () => void;
}

const rarityColors: Record<string, string> = {
  Common: 'bg-gray-500',
  Rare: 'bg-blue-500',
  Epic: 'bg-purple-500',
  Legendary: 'bg-yellow-500',
};

export default function PowersCatalog({ apiUrl, onBack }: PowersCatalogProps) {
  const [powers, setPowers] = useState<Power[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPowers = async () => {
      try {
        const response = await fetch(`${apiUrl}?action=catalog`);
        const data = await response.json();
        setPowers(data.powers || []);
      } catch (error) {
        console.error('Fetch powers error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPowers();
  }, [apiUrl]);

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-background via-purple-950/10 to-background">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black neon-text mb-2">POWERS CATALOG</h1>
            <p className="text-muted-foreground text-sm uppercase tracking-wider">All available abilities</p>
          </div>
          <Button onClick={onBack} variant="outline" className="border-primary/40">
            <Icon name="ArrowLeft" size={16} className="mr-2" />
            Back
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Icon name="Loader2" size={48} className="animate-spin text-primary mx-auto mb-4" />
            <p className="text-muted-foreground">Loading powers...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {powers.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <Icon name="Package" size={48} className="text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No powers available yet. Admin needs to create powers first.</p>
              </div>
            ) : (
              powers.map((power) => (
                <Card key={power.id} className="p-6 bg-card/50 backdrop-blur-sm border-primary/20 hover:border-primary/50 transition-all hover:scale-105">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">{power.name}</h3>
                      <Badge className={`${rarityColors[power.rarity] || 'bg-gray-500'} text-white mb-2`}>
                        {power.rarity}
                      </Badge>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
                        {power.power_type}
                      </div>
                    </div>
                    <Icon 
                      name={power.power_type === 'attack' ? 'Zap' : power.power_type === 'defense' ? 'Shield' : 'Crosshair'} 
                      size={32} 
                      className="text-primary" 
                    />
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">Cooldown: <span className="text-foreground font-medium">{power.cooldown}s</span></p>
                    {power.power_type === 'attack' && (
                      <p className="text-muted-foreground">Damage: <span className="text-red-400 font-medium">{power.damage}</span></p>
                    )}
                    {power.power_type === 'defense' && (
                      <p className="text-muted-foreground">Shield: <span className="text-blue-400 font-medium">{power.shield_duration}s</span></p>
                    )}
                    {power.power_type === 'counter' && (
                      <p className="text-muted-foreground">Counter: <span className="text-purple-400 font-medium">3s</span></p>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}