import React, { useState } from 'react';
import { useAuth } from '../../hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';

export function AuthTester() {
  const { 
    user, 
    isLoading, 
    loginMutation, 
    registerMutation, 
    logoutMutation 
  } = useAuth();
  
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ username, password });
  };
  
  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    registerMutation.mutate({ username, email, password, role: 'investor' });
  };
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Authentication Tester</CardTitle>
        <CardDescription>
          Test our new MongoDB authentication system
        </CardDescription>
      </CardHeader>
      <CardContent>
        {user ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-100 rounded-md">
              <h3 className="font-medium">Logged in as:</h3>
              <p>Username: {user.username}</p>
              <p>Email: {user.email}</p>
              <p>Role: {user.role}</p>
              <p>Wallet: {user.walletAddress || 'Not connected'}</p>
            </div>
            <Button onClick={handleLogout} variant="destructive">Logout</Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>
            <div className="flex space-x-4">
              <Button onClick={handleLogin} disabled={loginMutation.isPending}>
                {loginMutation.isPending ? 'Logging in...' : 'Login'}
              </Button>
              <Button onClick={handleRegister} variant="outline" disabled={registerMutation.isPending}>
                {registerMutation.isPending ? 'Registering...' : 'Register'}
              </Button>
            </div>
            {loginMutation.isError && (
              <div className="p-2 text-sm text-red-600 bg-red-100 rounded">
                {loginMutation.error.message}
              </div>
            )}
            {registerMutation.isError && (
              <div className="p-2 text-sm text-red-600 bg-red-100 rounded">
                {registerMutation.error.message}
              </div>
            )}
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-gray-500">
        MongoDB Authentication Status: {user ? 'Connected' : 'Not Connected'}
      </CardFooter>
    </Card>
  );
}