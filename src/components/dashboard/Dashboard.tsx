import React, { useState } from 'react';
import { TabNavigation } from './TabNavigation';
import { AgentTab } from './tabs/AgentTab';
import { CreateTab } from './tabs/CreateTab';
import { LibraryTab } from './tabs/LibraryTab';
import { EditTab } from './tabs/EditTab';
import { PublishTab } from './tabs/PublishTab';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { LogOut, Sparkles } from 'lucide-react';

export type TabType = 'agent' | 'create' | 'library' | 'edit' | 'publish';

interface DashboardProps {
  initialTab?: TabType;
}

export const Dashboard: React.FC<DashboardProps> = ({ initialTab = 'agent' }) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const { user, signOut } = useAuth();

  const handleSelectContent = (content: any) => {
    setSelectedContent(content);
    setActiveTab('edit');
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'agent':
        return <AgentTab />;
      case 'create':
        return <CreateTab />;
      case 'library':
        return <LibraryTab onSelectContent={handleSelectContent} />;
      case 'edit':
        return <EditTab selectedContent={selectedContent} />;
      case 'publish':
        return <PublishTab />;
      default:
        return <AgentTab />;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-surface/50 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-foreground">Amythic AI</h1>
              <p className="text-sm text-muted-foreground">Welcome back, {user?.email}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="btn-ghost"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Navigation */}
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        {renderTabContent()}
      </main>
    </div>
  );
};