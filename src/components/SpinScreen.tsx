import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';
import type { User } from '@/pages/Index';

interface Power {
  id: number;
  name: string;
  rarity: string;
  effect: string;
}

interface SpinScreenProps {
  userId: number;
  spins: number;
  apiUrl: string;
  onBack: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const rarityColors: Record<string, string> = {
  Common: 'bg-gray-500',
  Rare: 'bg-blue-500',
  Epic: 'bg-purple-500',
  Legendary: 'bg-yellow-500',
};

export default function SpinScreen({ userId, spins, apiUrl, onBack, updateUser }: SpinScreenProps) {
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Power | null>(null);

  const handleSpin = async () => {
    if (spins < 1) {
      toast.error('Not enough spins!');
      return;
    }

    setSpinning(true);
    setResult(null);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'spin', user_id: userId }),
      });

      const data = await response.json();

      if (data.success && data.power) {
        setTimeout(() => {
          setResult(data.power);
          updateUser({ spins: spins - 1 });
          toast.success(`You got ${data.power.name}!`);
          setSpinning(false);
        }, 2000);
      } else {
        toast.error(data.error || 'Spin failed');
        setSpinning(false);
      }
    } catch (error) {
      console.error('Spin error:', error);
      toast.error('Connection error');
      setSpinning(false);
    }
  };

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-background via-purple-950/10 to-background flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black neon-text mb-2">SPIN ROULETTE</h1>
            <p className="text-muted-foreground text-sm uppercase tracking-wider">
              Available Spins: <span className="text-secondary font-bold">{spins}</span>
            </p>
          </div>
          <Button onClick={onBack} variant="outline" className="border-secondary/40">
            <Icon name="ArrowLeft" size={16} className="mr-2" />
            Back
          </Button>
        </div>

        <Card className="p-12 bg-card/50 backdrop-blur-xl neon-border text-center">
          {spinning ? (
            <div className="py-12">
              <div className="relative w-48 h-48 mx-auto mb-8">
                <div className="absolute inset-0 rounded-full border-8 border-primary/20"></div>
                <div className="absolute inset-0 rounded-full border-8 border-t-primary border-r-secondary border-b-accent border-l-primary/20 animate-spin"></div>
                <Icon name="Sparkles" size={64} className="absolute inset-0 m-auto text-primary animate-pulse" />
              </div>
              <p className="text-2xl font-bold text-primary animate-pulse">Spinning...</p>
            </div>
          ) : result ? (
            <div className="py-8 animate-scale-in">
              <div className="mb-6 p-8 rounded-full bg-gradient-to-r from-primary to-secondary inline-block neon-glow">
                <Icon name="Zap" size={64} className="text-white" />
              </div>
              <h2 className="text-3xl font-black mb-4 neon-text">{result.name}</h2>
              <Badge className={`${rarityColors[result.rarity]} text-white text-lg px-4 py-2 mb-4`}>
                {result.rarity}
              </Badge>
              <p className="text-muted-foreground mb-8">{result.effect}</p>
              <Button
                onClick={() => setResult(null)}
                className="bg-gradient-to-r from-primary to-secondary hover:from-primary/80 hover:to-secondary/80"
              >
                Spin Again
              </Button>
            </div>
          ) : (
            <div className="py-8">
              <div className="mb-8 p-8 rounded-full bg-secondary/10 inline-block border-4 border-secondary/30">
                <Icon name="Sparkles" size={64} className="text-secondary" />
              </div>
              <h2 className="text-2xl font-bold mb-4">Ready to Spin?</h2>
              <p className="text-muted-foreground mb-8">
                Use your spins to get random powers!<br />
                Higher rarity = Lower chance
              </p>
              <Button
                onClick={handleSpin}
                disabled={spins < 1}
                size="lg"
                className="text-xl font-black px-12 py-6 bg-gradient-to-r from-secondary to-primary hover:from-secondary/80 hover:to-primary/80 neon-glow"
              >
                <Icon name="Sparkles" size={24} className="mr-3" />
                SPIN NOW
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
