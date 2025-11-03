import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';

interface InventoryItem {
  id: number;
  name: string;
  rarity: string;
  effect: string;
  obtained_at: string;
}

interface InventoryScreenProps {
  userId: number;
  apiUrl: string;
  onBack: () => void;
}

const rarityColors: Record<string, string> = {
  Common: 'bg-gray-500',
  Rare: 'bg-blue-500',
  Epic: 'bg-purple-500',
  Legendary: 'bg-yellow-500',
};

export default function InventoryScreen({ userId, apiUrl, onBack }: InventoryScreenProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInventory = async () => {
      try {
        const response = await fetch(`${apiUrl}?action=inventory&user_id=${userId}`);
        const data = await response.json();
        setInventory(data.inventory || []);
      } catch (error) {
        console.error('Fetch inventory error:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInventory();
  }, [userId, apiUrl]);

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-background via-purple-950/10 to-background">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black neon-text mb-2">INVENTORY</h1>
            <p className="text-muted-foreground text-sm uppercase tracking-wider">Your collected powers</p>
          </div>
          <Button onClick={onBack} variant="outline" className="border-accent/40">
            <Icon name="ArrowLeft" size={16} className="mr-2" />
            Back
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Icon name="Loader2" size={48} className="animate-spin text-accent mx-auto mb-4" />
            <p className="text-muted-foreground">Loading inventory...</p>
          </div>
        ) : inventory.length === 0 ? (
          <Card className="p-12 text-center bg-card/50 backdrop-blur-sm">
            <Icon name="Package" size={64} className="text-muted-foreground mx-auto mb-4" />
            <h3 className="text-2xl font-bold mb-2">Empty Inventory</h3>
            <p className="text-muted-foreground">Use spins to collect powers!</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventory.map((item) => (
              <Card key={item.id} className="p-6 bg-card/50 backdrop-blur-sm border-accent/20 hover:border-accent/50 transition-all hover:scale-105">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-bold mb-2">{item.name}</h3>
                    <Badge className={`${rarityColors[item.rarity]} text-white mb-2`}>
                      {item.rarity}
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      Obtained: {new Date(item.obtained_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Icon name="Sparkles" size={32} className="text-accent" />
                </div>
                <p className="text-sm text-muted-foreground">{item.effect}</p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
