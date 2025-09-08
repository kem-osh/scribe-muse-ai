import React, { useState } from 'react';
import { TabNavigation } from './TabNavigation';
import { AgentTab } from './tabs/AgentTab';
import { CreateTab } from './tabs/CreateTab';
import { LibraryTab } from './tabs/LibraryTab';
import { EditTab } from './tabs/EditTab';
import { PublishTab } from './tabs/PublishTab';
import { useAuth } from '@/hooks/useAuth';

export type TabType = 'agent' | 'create' | 'library' | 'edit' | 'publish';

interface DashboardProps {
  initialTab?: TabType;
}

export const Dashboard: React.FC<DashboardProps> = ({ initialTab = 'agent' }) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [selectedContent, setSelectedContent] = useState<any>(null);
  const { user } = useAuth();

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
      {/* Navigation with integrated header */}
      <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} user={user} />

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {renderTabContent()}
      </main>
    </div>
  );
};