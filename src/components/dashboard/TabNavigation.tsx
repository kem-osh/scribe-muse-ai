import React from 'react';
import { TabType } from './Dashboard';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { 
  MessageSquare, 
  Plus, 
  Library, 
  Edit3, 
  Share2,
  Settings,
  Sparkles,
  LogOut,
  MessageCircle
} from 'lucide-react';
import { User } from '@supabase/supabase-js';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  user: User | null;
}

const tabs = [
  { id: 'agent' as TabType, label: 'Agent', icon: MessageSquare },
  { id: 'create' as TabType, label: 'Create', icon: Plus },
  { id: 'library' as TabType, label: 'Library', icon: Library },
  { id: 'edit' as TabType, label: 'Edit', icon: Edit3 },
  { id: 'publish' as TabType, label: 'Publish', icon: Share2 },
  { id: 'settings' as TabType, label: 'Settings', icon: Settings },
];

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
  user
}) => {
  const { signOut } = useAuth();

  const handleFeedbackClick = () => {
    window.dispatchEvent(new Event('open-feedback'));
  };

  return (
    <nav className="tab-nav shadow-sm">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3">
        {/* Brand */}
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-9 h-9 bg-gradient-to-br from-primary via-primary/90 to-primary/80 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300 hover:scale-105">
            <Sparkles className="w-5 h-5 text-white drop-shadow-sm" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-xl font-bold bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">
              Flux Capacitor AI
            </h1>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex-1 max-w-3xl mx-6 hidden md:block">
          <div className="flex justify-center bg-muted/30 rounded-2xl p-1 backdrop-blur-sm border border-border/50">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`tab-item ${isActive ? 'tab-item-active' : ''} flex items-center justify-center space-x-2 flex-1 min-h-[44px] px-4 py-2 relative z-10`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile Tab Navigation */}
        <div className="md:hidden flex-1 max-w-md mx-4">
          <div className="flex bg-muted/30 rounded-xl p-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`tab-item ${isActive ? 'tab-item-active' : ''} flex flex-col items-center justify-center space-y-1 flex-1 min-h-[48px] px-1 py-2`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* User Info & Actions */}
        <div className="flex items-center space-x-3 min-w-0">
          <div className="hidden lg:block text-right min-w-0">
            <p className="text-sm text-muted-foreground/80 truncate">{user?.email}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFeedbackClick}
            className="btn-ghost flex-shrink-0 hover:bg-accent/10 hover:text-accent transition-all duration-200"
            aria-label="Send feedback"
          >
            <MessageCircle className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Feedback</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="btn-ghost flex-shrink-0 hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
          >
            <LogOut className="w-4 h-4 sm:mr-2" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </div>
    </nav>
  );
};