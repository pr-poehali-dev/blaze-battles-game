import { useState, useEffect } from 'react';
import AuthPage from '@/components/AuthPage';
import GameDashboard from '@/components/GameDashboard';

const API_URLS = {
  auth: 'https://functions.poehali.dev/4b40c0ad-481c-4c2b-90f0-b8c952f2e1d3',
  game: 'https://functions.poehali.dev/c1a733f2-ffe4-4bad-91e8-d25215431bcf',
  powers: 'https://functions.poehali.dev/4665dbe1-145b-471f-8372-d69b51760763',
};

export interface User {
  id: number;
  nick: string;
  money: number;
  spins: number;
  wins: number;
  losses: number;
  is_admin?: boolean;
}

export default function Index() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('blaze_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = (userData: User) => {
    setUser(userData);
    localStorage.setItem('blaze_user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('blaze_user');
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      localStorage.setItem('blaze_user', JSON.stringify(updatedUser));
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {!user ? (
        <AuthPage onLogin={handleLogin} apiUrl={API_URLS.auth} />
      ) : (
        <GameDashboard 
          user={user} 
          onLogout={handleLogout}
          updateUser={updateUser}
          apiUrls={API_URLS}
        />
      )}
    </div>
  );
}