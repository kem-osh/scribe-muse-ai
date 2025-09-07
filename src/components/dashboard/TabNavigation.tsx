import React from 'react';
import { TabType } from './Dashboard';
import { 
  MessageSquare, 
  Plus, 
  Library, 
  Edit3, 
  Share2 
} from 'lucide-react';

interface TabNavigationProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs = [
  { id: 'agent' as TabType, label: 'Agent', icon: MessageSquare },
  { id: 'create' as TabType, label: 'Create', icon: Plus },
  { id: 'library' as TabType, label: 'Library', icon: Library },
  { id: 'edit' as TabType, label: 'Edit', icon: Edit3 },
  { id: 'publish' as TabType, label: 'Publish', icon: Share2 },
];

export const TabNavigation: React.FC<TabNavigationProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <nav className="tab-nav">
      <div className="flex w-full">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`tab-item ${isActive ? 'tab-item-active' : ''} flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 flex-1 min-h-[60px] sm:min-h-[48px] px-2 py-2`}
            >
              <Icon className="w-4 h-4 sm:w-4 sm:h-4" />
              <span className="text-xs sm:text-sm font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};