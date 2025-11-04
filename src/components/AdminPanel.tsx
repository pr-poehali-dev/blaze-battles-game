import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import Icon from '@/components/ui/icon';
import { toast } from 'sonner';

interface AdminPanelProps {
  apiUrl: string;
  onBack: () => void;
  currentUser: {
    id: number;
    nick: string;
    money: number;
    spins: number;
  };
  updateUser: (updates: any) => void;
}

interface Rarity {
  id: number;
  name: string;
  drop_chance: number;
  color: string;
}

interface Power {
  id: number;
  name: string;
  rarity_id: number;
  rarity_name: string;
  power_type: string;
  cooldown: number;
  damage: number;
  shield_duration: number;
}

export default function AdminPanel({ apiUrl, onBack, currentUser, updateUser }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<'power' | 'rarity' | 'give'>('power');
  const [rarities, setRarities] = useState<Rarity[]>([]);
  const [powers, setPowers] = useState<Power[]>([]);
  const [loading, setLoading] = useState(false);

  const [powerForm, setPowerForm] = useState({
    name: '',
    rarity_id: '',
    power_type: 'attack',
    cooldown: '0',
    damage: '0',
    shield_duration: '0',
  });

  const [rarityForm, setRarityForm] = useState({
    name: '',
    drop_chance: '',
    color: '#6B7280',
  });

  const [giveForm, setGiveForm] = useState({
    type: 'spins',
    target: 'user',
    nick: '',
    amount: '',
  });

  useEffect(() => {
    fetchRarities();
    fetchPowers();
  }, []);

  const fetchRarities = async () => {
    try {
      const response = await fetch(`${apiUrl}?action=admin_get_rarities`);
      const data = await response.json();
      console.log('Rarities response:', data);
      if (data.success) {
        console.log('Setting rarities:', data.rarities);
        setRarities(data.rarities || []);
      } else {
        console.error('Rarities fetch failed:', data);
      }
    } catch (error) {
      console.error('Fetch rarities error:', error);
    }
  };

  const fetchPowers = async () => {
    try {
      const response = await fetch(`${apiUrl}?action=admin_get_powers`);
      const data = await response.json();
      if (data.success) {
        setPowers(data.powers || []);
      }
    } catch (error) {
      console.error('Fetch powers error:', error);
    }
  };

  const handleCreatePower = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'admin_create_power',
          ...powerForm,
          cooldown: parseInt(powerForm.cooldown),
          damage: parseInt(powerForm.damage),
          shield_duration: parseInt(powerForm.shield_duration),
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Power created successfully!');
        setPowerForm({
          name: '',
          rarity_id: '',
          power_type: 'attack',
          cooldown: '0',
          damage: '0',
          shield_duration: '0',
        });
        fetchPowers();
      } else {
        toast.error(data.error || 'Failed to create power');
      }
    } catch (error) {
      console.error('Create power error:', error);
      toast.error('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePower = async (powerId: number) => {
    if (!confirm('Delete this power?')) return;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'admin_delete_power',
          power_id: powerId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Power deleted!');
        fetchPowers();
      } else {
        toast.error(data.error || 'Failed to delete');
      }
    } catch (error) {
      console.error('Delete power error:', error);
      toast.error('Connection error');
    }
  };

  const handleCreateRarity = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'admin_create_rarity',
          ...rarityForm,
          drop_chance: parseFloat(rarityForm.drop_chance),
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Rarity created successfully!');
        setRarityForm({ name: '', drop_chance: '', color: '#6B7280' });
        fetchRarities();
      } else {
        toast.error(data.error || 'Failed to create rarity');
      }
    } catch (error) {
      console.error('Create rarity error:', error);
      toast.error('Connection error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRarity = async (rarityId: number) => {
    if (!confirm('Delete this rarity? All powers with this rarity will also be deleted!')) return;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'admin_delete_rarity',
          rarity_id: rarityId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Rarity deleted!');
        fetchRarities();
        fetchPowers();
      } else {
        toast.error(data.error || 'Failed to delete');
      }
    } catch (error) {
      console.error('Delete rarity error:', error);
      toast.error('Connection error');
    }
  };

  const handleGive = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: giveForm.type === 'spins' ? 'admin_give_spins' : 'admin_give_money',
          target: giveForm.target,
          nick: giveForm.target === 'user' ? giveForm.nick : undefined,
          amount: parseInt(giveForm.amount),
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`${giveForm.type} given successfully!`);
        
        // Update current user if resources were given to them
        if (giveForm.target === 'all' || giveForm.nick === currentUser.nick) {
          const amountToAdd = parseInt(giveForm.amount);
          if (giveForm.type === 'spins') {
            updateUser({ spins: currentUser.spins + amountToAdd });
          } else {
            updateUser({ money: currentUser.money + amountToAdd });
          }
        }
        
        setGiveForm({ ...giveForm, nick: '', amount: '' });
      } else {
        toast.error(data.error || 'Failed to give resources');
      }
    } catch (error) {
      console.error('Give resources error:', error);
      toast.error('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-background via-red-950/10 to-background">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-black text-red-500 mb-2">ADMIN PANEL</h1>
            <p className="text-muted-foreground text-sm uppercase tracking-wider">
              Full system control
            </p>
          </div>
          <Button onClick={onBack} variant="outline" className="border-red-500/40">
            <Icon name="ArrowLeft" size={16} className="mr-2" />
            Back
          </Button>
        </div>

        <div className="flex gap-4 mb-6">
          <Button
            onClick={() => setActiveTab('power')}
            variant={activeTab === 'power' ? 'default' : 'outline'}
            className={activeTab === 'power' ? 'bg-red-500' : ''}
          >
            Create Power
          </Button>
          <Button
            onClick={() => setActiveTab('rarity')}
            variant={activeTab === 'rarity' ? 'default' : 'outline'}
            className={activeTab === 'rarity' ? 'bg-red-500' : ''}
          >
            Create Rarity
          </Button>
          <Button
            onClick={() => setActiveTab('give')}
            variant={activeTab === 'give' ? 'default' : 'outline'}
            className={activeTab === 'give' ? 'bg-red-500' : ''}
          >
            Give Resources
          </Button>
        </div>

        {activeTab === 'power' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 bg-card/50 backdrop-blur-sm">
              <h2 className="text-2xl font-bold mb-6">Create Power</h2>
              <form onSubmit={handleCreatePower} className="space-y-4">
                <div>
                  <Label htmlFor="power-name">Power Name</Label>
                  <Input
                    id="power-name"
                    value={powerForm.name}
                    onChange={(e) => setPowerForm({ ...powerForm, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="power-rarity">Rarity</Label>
                  <Select
                    value={powerForm.rarity_id}
                    onValueChange={(value) => setPowerForm({ ...powerForm, rarity_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select rarity" />
                    </SelectTrigger>
                    <SelectContent>
                      {rarities.map((rarity) => (
                        <SelectItem key={rarity.id} value={rarity.id.toString()}>
                          {rarity.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="power-type">Type</Label>
                  <Select
                    value={powerForm.power_type}
                    onValueChange={(value) =>
                      setPowerForm({
                        ...powerForm,
                        power_type: value,
                        damage: value === 'defense' ? '0' : powerForm.damage,
                        shield_duration: value !== 'defense' ? '0' : powerForm.shield_duration,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="attack">Attack</SelectItem>
                      <SelectItem value="defense">Defense</SelectItem>
                      <SelectItem value="counter">Counter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="power-cooldown">Cooldown (seconds)</Label>
                  <Input
                    id="power-cooldown"
                    type="number"
                    min="0"
                    value={powerForm.cooldown}
                    onChange={(e) => setPowerForm({ ...powerForm, cooldown: e.target.value })}
                    required
                  />
                </div>

                {(powerForm.power_type === 'attack' || powerForm.power_type === 'counter') && (
                  <div>
                    <Label htmlFor="power-damage">Damage</Label>
                    <Input
                      id="power-damage"
                      type="number"
                      min="1"
                      value={powerForm.damage}
                      onChange={(e) => setPowerForm({ ...powerForm, damage: e.target.value })}
                      required
                    />
                  </div>
                )}

                {powerForm.power_type === 'defense' && (
                  <div>
                    <Label htmlFor="power-shield">Shield Duration (seconds)</Label>
                    <Input
                      id="power-shield"
                      type="number"
                      min="1"
                      value={powerForm.shield_duration}
                      onChange={(e) =>
                        setPowerForm({ ...powerForm, shield_duration: e.target.value })
                      }
                      required
                    />
                  </div>
                )}

                <Button type="submit" disabled={loading} className="w-full bg-red-500">
                  {loading ? 'Creating...' : 'Create Power'}
                </Button>
              </form>
            </Card>

            <Card className="p-6 bg-card/50 backdrop-blur-sm">
              <h2 className="text-2xl font-bold mb-6">Existing Powers</h2>
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {powers.map((power) => (
                  <Card key={power.id} className="p-4 bg-card/30">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-bold">{power.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {power.rarity_name} • {power.power_type} • CD: {power.cooldown}s
                        </p>
                        {power.damage > 0 && (
                          <p className="text-sm text-red-400">Damage: {power.damage}</p>
                        )}
                        {power.shield_duration > 0 && (
                          <p className="text-sm text-blue-400">Shield: {power.shield_duration}s</p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeletePower(power.id)}
                      >
                        <Icon name="Trash2" size={16} />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'rarity' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 bg-card/50 backdrop-blur-sm">
              <h2 className="text-2xl font-bold mb-6">Create Rarity</h2>
              <form onSubmit={handleCreateRarity} className="space-y-4">
                <div>
                  <Label htmlFor="rarity-name">Rarity Name</Label>
                  <Input
                    id="rarity-name"
                    value={rarityForm.name}
                    onChange={(e) => setRarityForm({ ...rarityForm, name: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="rarity-chance">Drop Chance (%)</Label>
                  <Input
                    id="rarity-chance"
                    type="number"
                    min="0.01"
                    max="100"
                    step="0.01"
                    value={rarityForm.drop_chance}
                    onChange={(e) => setRarityForm({ ...rarityForm, drop_chance: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="rarity-color">Color (Hex)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="rarity-color"
                      type="color"
                      value={rarityForm.color}
                      onChange={(e) => setRarityForm({ ...rarityForm, color: e.target.value })}
                      className="w-20"
                    />
                    <Input
                      value={rarityForm.color}
                      onChange={(e) => setRarityForm({ ...rarityForm, color: e.target.value })}
                      placeholder="#6B7280"
                    />
                  </div>
                </div>

                <Button type="submit" disabled={loading} className="w-full bg-red-500">
                  {loading ? 'Creating...' : 'Create Rarity'}
                </Button>
              </form>
            </Card>

            <Card className="p-6 bg-card/50 backdrop-blur-sm">
              <h2 className="text-2xl font-bold mb-6">Existing Rarities</h2>
              <div className="space-y-3">
                {rarities.map((rarity) => (
                  <Card key={rarity.id} className="p-4 bg-card/30">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div
                          className="w-8 h-8 rounded"
                          style={{ backgroundColor: rarity.color }}
                        />
                        <div>
                          <h3 className="font-bold">{rarity.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Drop: {rarity.drop_chance}%
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteRarity(rarity.id)}
                      >
                        <Icon name="Trash2" size={16} />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'give' && (
          <Card className="p-6 bg-card/50 backdrop-blur-sm max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">Give Resources</h2>
            <form onSubmit={handleGive} className="space-y-4">
              <div>
                <Label>Resource Type</Label>
                <Select
                  value={giveForm.type}
                  onValueChange={(value) => setGiveForm({ ...giveForm, type: value as 'spins' | 'money' })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="spins">Spins</SelectItem>
                    <SelectItem value="money">Money</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Target</Label>
                <Select
                  value={giveForm.target}
                  onValueChange={(value) =>
                    setGiveForm({ ...giveForm, target: value as 'user' | 'all' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Specific User</SelectItem>
                    <SelectItem value="all">All Users</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {giveForm.target === 'user' && (
                <div>
                  <Label htmlFor="give-nick">Username</Label>
                  <Input
                    id="give-nick"
                    value={giveForm.nick}
                    onChange={(e) => setGiveForm({ ...giveForm, nick: e.target.value })}
                    required
                  />
                </div>
              )}

              <div>
                <Label htmlFor="give-amount">Amount</Label>
                <Input
                  id="give-amount"
                  type="number"
                  min="1"
                  value={giveForm.amount}
                  onChange={(e) => setGiveForm({ ...giveForm, amount: e.target.value })}
                  required
                />
              </div>

              <Button type="submit" disabled={loading} className="w-full bg-red-500">
                {loading ? 'Processing...' : `Give ${giveForm.type}`}
              </Button>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
}