import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface InventoryItem {
  id: number;
  name: string;
  rarity: string;
  rarity_color: string;
  power_type: string;
  cooldown: number;
  damage: number;
  shield_duration: number;
  obtained_at: string;
  equipped_slot: number | null;
}

interface InventoryScreenProps {
  userId: number;
  apiUrl: string;
  onBack: () => void;
  currentUser: {
    money: number;
  };
  updateUser: (updates: any) => void;
}

export default function InventoryScreen({ userId, apiUrl, onBack, currentUser, updateUser }: InventoryScreenProps) {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [slot2Unlocked, setSlot2Unlocked] = useState(true);
  const [slot3Unlocked, setSlot3Unlocked] = useState(true);

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

  const fetchSlots = async () => {
    try {
      const response = await fetch(`${apiUrl}?action=get_user_slots&user_id=${userId}`);
      const data = await response.json();
      if (data.success) {
        setSlot2Unlocked(data.slot2_unlocked);
        setSlot3Unlocked(data.slot3_unlocked);
      }
    } catch (error) {
      console.error('Fetch slots error:', error);
    }
  };

  useEffect(() => {
    fetchInventory();
    fetchSlots();
  }, [userId, apiUrl]);

  const handleBuySlot = async (slotNumber: number) => {
    const cost = slotNumber === 2 ? 1000 : 2000;
    
    if (currentUser.money < cost) {
      toast.error(`Not enough money! Need ${cost} coins`);
      return;
    }

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'buy_slot',
          user_id: userId,
          slot_number: slotNumber,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Slot ${slotNumber} unlocked!`);
        if (slotNumber === 2) setSlot2Unlocked(true);
        if (slotNumber === 3) setSlot3Unlocked(true);
        updateUser({ money: data.money });
      } else {
        toast.error(data.error || 'Failed to buy slot');
      }
    } catch (error) {
      console.error('Buy slot error:', error);
      toast.error('Connection error');
    }
  };

  const handleEquip = async (powerId: number, slot: number) => {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'equip_power',
          user_id: userId,
          power_id: powerId,
          slot: slot,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Equipped to slot ${slot}!`);
        fetchInventory();
      } else {
        toast.error(data.error || 'Failed to equip');
      }
    } catch (error) {
      console.error('Equip error:', error);
      toast.error('Connection error');
    }
  };

  const handleUnequip = async (powerId: number) => {
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'unequip_power',
          user_id: userId,
          power_id: powerId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Unequipped!');
        fetchInventory();
      } else {
        toast.error(data.error || 'Failed to unequip');
      }
    } catch (error) {
      console.error('Unequip error:', error);
      toast.error('Connection error');
    }
  };

  const equippedPowers = inventory.filter(item => item.equipped_slot !== null);
  const unequippedPowers = inventory.filter(item => item.equipped_slot === null);

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-background via-purple-950/10 to-background">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black neon-text mb-2">INVENTORY</h1>
            <p className="text-muted-foreground text-sm uppercase tracking-wider">Manage your powers</p>
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
        ) : (
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Icon name="Swords" size={24} className="text-primary" />
                Equipped Powers (Max 3)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map((slot) => {
                  const power = equippedPowers.find(p => p.equipped_slot === slot);
                  const isLocked = (slot === 2 && !slot2Unlocked) || (slot === 3 && !slot3Unlocked);
                  const cost = slot === 2 ? 1000 : 2000;
                  
                  if (!power) {
                    if (isLocked) {
                      return (
                        <Card key={slot} className="p-8 bg-card/30 backdrop-blur-sm border-dashed border-2 border-yellow-500/40">
                          <div className="text-center">
                            <Icon name="Lock" size={40} className="mx-auto mb-4 text-yellow-500" />
                            <p className="text-muted-foreground text-sm mb-3">Slot {slot} Locked</p>
                            <Button 
                              onClick={() => handleBuySlot(slot)}
                              size="sm"
                              className="bg-yellow-500 hover:bg-yellow-600 text-black font-bold"
                            >
                              <Icon name="Coins" size={16} className="mr-1" />
                              Unlock for {cost}
                            </Button>
                          </div>
                        </Card>
                      );
                    }
                    
                    return (
                      <Card key={slot} className="p-8 bg-card/30 backdrop-blur-sm border-dashed border-2 border-muted-foreground/20">
                        <div className="text-center">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted-foreground/10 flex items-center justify-center">
                            <span className="text-3xl font-black text-muted-foreground">{slot}</span>
                          </div>
                          <p className="text-muted-foreground text-sm">Empty Slot</p>
                        </div>
                      </Card>
                    );
                  }

                  return (
                    <Card 
                      key={slot} 
                      className="p-6 bg-card/50 backdrop-blur-sm border-2 neon-glow"
                      style={{ borderColor: power.rarity_color }}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl font-black text-primary">{slot}</span>
                            <h3 className="text-lg font-bold">{power.name}</h3>
                          </div>
                          <Badge className="text-white mb-2" style={{ backgroundColor: power.rarity_color }}>
                            {power.rarity}
                          </Badge>
                        </div>
                        <Icon 
                          name={power.power_type === 'attack' ? 'Zap' : power.power_type === 'defense' ? 'Shield' : 'Crosshair'} 
                          size={28} 
                          className="text-primary" 
                        />
                      </div>
                      <div className="space-y-1 text-xs mb-4">
                        <p className="text-muted-foreground uppercase font-semibold">{power.power_type}</p>
                        <p className="text-muted-foreground">Cooldown: <span className="text-foreground">{power.cooldown}s</span></p>
                        {power.power_type === 'attack' && (
                          <p className="text-muted-foreground">Damage: <span className="text-red-400">{power.damage}</span></p>
                        )}
                        {power.power_type === 'defense' && (
                          <p className="text-muted-foreground">Shield: <span className="text-blue-400">{power.shield_duration}s</span></p>
                        )}
                      </div>
                      <Button
                        onClick={() => handleUnequip(power.id)}
                        variant="outline"
                        size="sm"
                        className="w-full border-destructive/40 hover:bg-destructive/10"
                      >
                        <Icon name="X" size={14} className="mr-1" />
                        Unequip
                      </Button>
                    </Card>
                  );
                })}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Icon name="Package" size={24} className="text-accent" />
                Available Powers ({unequippedPowers.length})
              </h2>
              
              {unequippedPowers.length === 0 ? (
                <Card className="p-12 text-center bg-card/50 backdrop-blur-sm">
                  <Icon name="Package" size={64} className="text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">All powers are equipped or inventory is empty!</p>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {unequippedPowers.map((item) => (
                    <Card 
                      key={item.id} 
                      className="p-6 bg-card/50 backdrop-blur-sm border-accent/20 hover:border-accent/50 transition-all"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold mb-2">{item.name}</h3>
                          <Badge className="text-white mb-2" style={{ backgroundColor: item.rarity_color }}>
                            {item.rarity}
                          </Badge>
                        </div>
                        <Icon 
                          name={item.power_type === 'attack' ? 'Zap' : item.power_type === 'defense' ? 'Shield' : 'Crosshair'} 
                          size={32} 
                          className="text-accent" 
                        />
                      </div>
                      
                      <div className="space-y-1 text-sm mb-4">
                        <p className="text-muted-foreground uppercase font-semibold text-xs">{item.power_type}</p>
                        <p className="text-muted-foreground">Cooldown: <span className="text-foreground">{item.cooldown}s</span></p>
                        {item.power_type === 'attack' && (
                          <p className="text-muted-foreground">Damage: <span className="text-red-400">{item.damage}</span></p>
                        )}
                        {item.power_type === 'defense' && (
                          <p className="text-muted-foreground">Shield: <span className="text-blue-400">{item.shield_duration}s</span></p>
                        )}
                        <p className="text-xs text-muted-foreground pt-2">
                          Obtained: {new Date(item.obtained_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex gap-2">
                        {equippedPowers.length < 3 ? (
                          <>
                            {[1, 2, 3].map((slot) => {
                              const isSlotTaken = equippedPowers.some(p => p.equipped_slot === slot);
                              const isSlotLocked = (slot === 2 && !slot2Unlocked) || (slot === 3 && !slot3Unlocked);
                              return (
                                <Button
                                  key={slot}
                                  onClick={() => handleEquip(item.id, slot)}
                                  disabled={isSlotTaken || isSlotLocked}
                                  size="sm"
                                  className="flex-1"
                                  variant={isSlotTaken || isSlotLocked ? 'outline' : 'default'}
                                >
                                  {isSlotLocked ? <Icon name="Lock" size={12} className="mr-1" /> : null}
                                  Slot {slot}
                                </Button>
                              );
                            })}
                          </>
                        ) : (
                          <Button disabled size="sm" className="w-full" variant="outline">
                            All slots full
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}