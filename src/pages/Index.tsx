import React from 'react';
import { AuthForm } from '@/components/auth/AuthForm';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="relative">
            <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary drop-shadow-sm" />
            <div className="absolute inset-0 w-12 h-12 mx-auto border-2 border-primary/20 rounded-full animate-pulse"></div>
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">Loading Flux Capacitor AI</h2>
            <p className="text-muted-foreground">Setting up your content workspace...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm onAuthSuccess={() => {}} />;
  }

  return <Dashboard />;
};

export default Index;
