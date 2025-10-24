
import React, { useState } from 'react';
import Header from './components/Header';
import Button from './components/shared/Button';
import ScriptGeneratorTab from './components/ScriptGeneratorTab';
import SettingsTab from './components/SettingsTab';

type Tab = 'script' | 'profile';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('script');
  const [googleApiKey, setGoogleApiKey] = useState<string>(() => localStorage.getItem('googleApiKey') || '');
  const [openaiApiKey, setOpenaiApiKey] = useState<string>(() => localStorage.getItem('openaiApiKey') || '');

  const handleGoogleKeySave = (key: string) => {
    setGoogleApiKey(key);
    localStorage.setItem('googleApiKey', key);
  };

  const handleOpenaiKeySave = (key: string) => {
    setOpenaiApiKey(key);
    localStorage.setItem('openaiApiKey', key);
  };

  const TabButton: React.FC<{ tabName: Tab; label: string }> = ({ tabName, label }) => (
    <Button
      variant={activeTab === tabName ? 'active' : 'secondary'}
      onClick={() => setActiveTab(tabName)}
      className="flex-1 text-xs sm:text-sm"
    >
      {label}
    </Button>
  );

  return (
    <div className="min-h-screen p-2 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto mt-10">
        <Header />
        <main className="bg-[#1e293b] text-gray-300 p-3 sm:p-6 rounded-lg border border-slate-700 shadow-2xl space-y-6">
          
          <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 border-b border-slate-700 pb-4">
            <TabButton tabName="script" label="WorkFlow" />
            <TabButton tabName="profile" label="Profile" />
          </div>

          <div>
            {activeTab === 'script' && <ScriptGeneratorTab 
                googleApiKey={googleApiKey} 
                openaiApiKey={openaiApiKey}
            />}
            {activeTab === 'profile' && <SettingsTab 
                googleApiKey={googleApiKey}
                openaiApiKey={openaiApiKey}
                onGoogleKeySave={handleGoogleKeySave}
                onOpenaiKeySave={handleOpenaiKeySave}
            />}
          </div>

        </main>
      </div>
    </div>
  );
};

export default App;
