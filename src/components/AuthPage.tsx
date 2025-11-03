import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import type { User } from '@/pages/Index';

interface AuthPageProps {
  onLogin: (user: User) => void;
  apiUrl: string;
}

export default function AuthPage({ onLogin, apiUrl }: AuthPageProps) {
  const [isRegister, setIsRegister] = useState(false);
  const [nick, setNick] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!/^[a-zA-Z0-9_]+$/.test(nick)) {
      toast.error('Nick must contain only English letters, numbers, and underscores');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isRegister ? 'register' : 'login',
          nick,
          password,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        toast.success(isRegister ? 'Registration successful!' : 'Welcome back!');
        onLogin(data.user);
      } else {
        toast.error(data.error || 'Authentication failed');
      }
    } catch (error) {
      toast.error('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background via-purple-950/20 to-background">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <Card className="w-full max-w-md p-8 bg-card/50 backdrop-blur-xl neon-border relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-black mb-2 neon-text glitch">BLAZE BATTLES</h1>
          <p className="text-muted-foreground text-sm uppercase tracking-wider">Cyberpunk Arena</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-primary uppercase tracking-wide">Nick</label>
            <Input
              value={nick}
              onChange={(e) => setNick(e.target.value)}
              placeholder="EnterYourNick"
              required
              className="bg-input border-primary/30 focus:border-primary transition-all"
            />
            <p className="text-xs text-muted-foreground">English letters, numbers, and underscores only</p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-secondary uppercase tracking-wide">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="bg-input border-secondary/30 focus:border-secondary transition-all"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/80 hover:to-secondary/80 text-primary-foreground font-bold uppercase tracking-wider neon-glow transition-all"
          >
            {loading ? 'Processing...' : isRegister ? 'Register' : 'Login'}
          </Button>

          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="w-full text-sm text-accent hover:text-accent/80 transition-colors"
          >
            {isRegister ? 'Already have an account? Login' : "Don't have an account? Register"}
          </button>
        </form>
      </Card>
    </div>
  );
}
