
import React, { useState } from 'react';
import Input from './shared/Input';
import Button from './shared/Button';

const SocialLink: React.FC<{ platform: string, url:string, handle: string, icon: React.ReactNode }> = ({ platform, url, handle, icon }) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center space-x-4 p-4 bg-slate-900/50 hover:bg-slate-700/50 border border-slate-700 rounded-lg transition-colors duration-200"
  >
    <div className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center">
      {icon}
    </div>
    <div>
      <p className="font-bold text-white text-lg">{platform}</p>
    </div>
  </a>
);

interface SettingsTabProps {
  googleApiKey: string;
  onGoogleKeySave: (key: string) => void;
  openaiApiKey: string;
  onOpenaiKeySave: (key: string) => void;
  grokApiKey: string;
  onGrokKeySave: (key: string) => void;
  deepseekApiKey: string;
  onDeepseekKeySave: (key: string) => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ 
    googleApiKey, onGoogleKeySave, 
    openaiApiKey, onOpenaiKeySave,
    grokApiKey, onGrokKeySave,
    deepseekApiKey, onDeepseekKeySave 
}) => {
  const [googleKeyInput, setGoogleKeyInput] = useState(googleApiKey);
  const [openaiKeyInput, setOpenaiKeyInput] = useState(openaiApiKey);
  const [grokKeyInput, setGrokKeyInput] = useState(grokApiKey);
  const [deepseekKeyInput, setDeepseekKeyInput] = useState(deepseekApiKey);

  const [googleKeyStatus, setGoogleKeyStatus] = useState('');
  const [openaiKeyStatus, setOpenaiKeyStatus] = useState('');
  const [grokKeyStatus, setGrokKeyStatus] = useState('');
  const [deepseekKeyStatus, setDeepseekKeyStatus] = useState('');

  const handleSaveGoogle = () => {
    onGoogleKeySave(googleKeyInput);
    setGoogleKeyStatus('Đã lưu!');
    setTimeout(() => setGoogleKeyStatus(''), 2000);
  };

  const handleSaveOpenai = () => {
    onOpenaiKeySave(openaiKeyInput);
    setOpenaiKeyStatus('Đã lưu!');
    setTimeout(() => setOpenaiKeyStatus(''), 2000);
  };

  const handleSaveGrok = () => {
    onGrokKeySave(grokKeyInput);
    setGrokKeyStatus('Đã lưu!');
    setTimeout(() => setGrokKeyStatus(''), 2000);
  };

  const handleSaveDeepseek = () => {
    onDeepseekKeySave(deepseekKeyInput);
    setDeepseekKeyStatus('Đã lưu!');
    setTimeout(() => setDeepseekKeyStatus(''), 2000);
  };


  const YoutubeIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="32" height="32" viewBox="0 0 48 48">
        <path fill="#FF3D00" d="M43.2,33.9c-0.4,2.1-2.1,3.7-4.2,4c-3.3,0.3-8.8,0.5-15,0.5s-11.7-0.2-15-0.5c-2.1-0.3-3.8-1.9-4.2-4C4.4,31.6,4,28.2,4,24s0.4-7.6,0.8-9.9c0.4-2.1,2.1-3.7,4.2-4C12.3,9.8,17.8,9.6,24,9.6s11.7,0.2,15,0.5c2.1,0.3,3.8,1.9,4.2,4c0.4,2.3,0.8,5.7,0.8,9.9S43.6,31.6,43.2,33.9z"></path><path fill="#FFF" d="M20 31L20 17 32 24z"></path>
    </svg>
  );

  const FacebookIcon = (
    <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="32" height="32" viewBox="0 0 48 48">
        <path fill="#039be5" d="M24 5A19 19 0 1 0 24 43A19 19 0 1 0 24 5z"></path><path fill="#fff" d="M26.572,29.036h4.917l0.772-4.995h-5.69v-2.73c0-2.075,0.678-3.915,2.619-3.915h3.119v-4.359c-0.548-0.074-1.707-0.236-3.897-0.236c-4.573,0-7.261,2.735-7.261,7.917v3.323h-4.701v4.995h4.701v13.729C22.089,42.905,23.032,43,24,43c0.875,0,1.729-0.08,2.572-0.194V29.036z"></path>
    </svg>
  );

  const TiktokIcon = (
    <svg width="32" height="32" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="12" fill="black"/>
        <path fill="white" d="M12.525 3.692v10.372c0 .524-.13 1.048-.383 1.513a3.39 3.39 0 0 1-2.023 1.905c-1.87.7-3.992-.17-4.69-1.87a3.34 3.34 0 0 1 1.74-4.522c.23-.105.475-.152.72-.152v-2.93c-.225-.015-.45-.03-.675-.03-2.925 0-5.295 2.37-5.295 5.295s2.37 5.295 5.295 5.295S14.625 17.07 14.625 14.1V8.657a4.99 4.99 0 0 0 2.228-4.215V3.692h-4.328Z"/>
    </svg>
  );

  const ZaloIcon = (
    <svg width="32" height="32" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
      <circle cx="100" cy="100" r="95" fill="white" stroke="#0190F3" strokeWidth="5"/>
      <path d="M100 35 C61.5 35 30 66.5 30 105 C30 134.7 48.4 159.2 75 168 L75 145 C60.7 138.3 50 123.1 50 105 C50 77.4 72.4 55 100 55 C127.6 55 150 77.4 150 105 C150 123.1 139.3 138.3 125 145 L125 168 C151.6 159.2 170 134.7 170 105 C170 66.5 138.5 35 100 35Z" fill="#0190F3"/>
      <text x="100" y="115" fontFamily="Arial, sans-serif" fontSize="60" fontWeight="bold" fill="white" textAnchor="middle">Zalo</text>
    </svg>
  );

  return (
    <div className="space-y-8 py-4">
      {/* API Key Section */}
      <div className="max-w-xl mx-auto bg-slate-900/50 p-4 sm:p-6 rounded-lg border border-slate-700">
        <h3 className="text-xl font-bold text-white mb-2 text-center">Cấu hình API Key</h3>
        <p className="text-center text-gray-400 mb-6 text-sm">
          Bạn cần cung cấp API key để ứng dụng có thể hoạt động.
          <br />
          API key sẽ được lưu trực tiếp trên trình duyệt của bạn.
        </p>
        
        <div className="space-y-6">
          {/* Google API Key */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label htmlFor="google-api-key" className="font-semibold text-white">Google Gemini API Key:</label>
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline">Lấy API Key</a>
            </div>
            <Input
              id="google-api-key"
              type="password"
              placeholder="Enter your Google Gemini API key"
              value={googleKeyInput}
              onChange={(e) => setGoogleKeyInput(e.target.value)}
            />
            <Button onClick={handleSaveGoogle} className="w-full">
               {googleKeyStatus || 'Save Google Key'}
            </Button>
          </div>

          {/* OpenAI API Key */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label htmlFor="openai-api-key" className="font-semibold text-white">Chat GPT API Key:</label>
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline">Lấy API Key</a>
            </div>
            <Input
              id="openai-api-key"
              type="password"
              placeholder="Enter your Chat GPT API key"
              value={openaiKeyInput}
              onChange={(e) => setOpenaiKeyInput(e.target.value)}
            />
            <Button onClick={handleSaveOpenai} className="w-full">
               {openaiKeyStatus || 'Save Chat GPT Key'}
            </Button>
          </div>

          {/* Grok API Key */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label htmlFor="grok-api-key" className="font-semibold text-white">Grok API Key:</label>
              <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline">Lấy API Key</a>
            </div>
            <Input
              id="grok-api-key"
              type="password"
              placeholder="Enter your Grok API key"
              value={grokKeyInput}
              onChange={(e) => setGrokKeyInput(e.target.value)}
            />
            <Button onClick={handleSaveGrok} className="w-full">
               {grokKeyStatus || 'Save Grok Key'}
            </Button>
          </div>

          {/* Deepseek API Key */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label htmlFor="deepseek-api-key" className="font-semibold text-white">Deepseek API Key:</label>
              <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 hover:underline">Lấy API Key</a>
            </div>
            <Input
              id="deepseek-api-key"
              type="password"
              placeholder="Enter your Deepseek API key"
              value={deepseekKeyInput}
              onChange={(e) => setDeepseekKeyInput(e.target.value)}
            />
            <Button onClick={handleSaveDeepseek} className="w-full">
               {deepseekKeyStatus || 'Save Deepseek Key'}
            </Button>
          </div>

        </div>
      </div>
      
      {/* Contact Section */}
      <div>
        <h3 className="text-xl font-bold text-white mb-4 text-center">Contact Information</h3>
        <p className="text-center text-gray-400 mb-8">
          Connect with Làm Youtube AI for support, updates, and more tutorials.
        </p>
      </div>
      <div className="max-w-md mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4">
        <SocialLink platform="Youtube" handle="@lukhach-digital" url="https://www.youtube.com/channel/UCwSbzgfgu1iMfOR__AB4QGQ?sub_confirmation=1" icon={YoutubeIcon} />
        <SocialLink platform="Facebook" handle="huynhxuyenson" url="https://facebook.com/huynhxuyenson" icon={FacebookIcon} />
        <SocialLink platform="Tiktok" handle="@lamyoutubeai" url="https://www.tiktok.com/@lamyoutubeai" icon={TiktokIcon} />
        <SocialLink platform="Zalo" handle="0979.007.367" url="https://zalo.me/g/fzzokk254" icon={ZaloIcon} />
      </div>
    </div>
  );
};

export default SettingsTab;