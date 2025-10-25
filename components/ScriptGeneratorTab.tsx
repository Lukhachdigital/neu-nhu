
import React, { useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import Button from './shared/Button';
import Input from './shared/Input';

// Define a structured prompt
interface Prompt {
  subject: string;
  action: string;
  setting: string;
  camera_shot: string;
  style: string;
  sound: string;
}

interface Scene {
  scene: number;
  description: string;
  prompt: Prompt; // The prompt is now a structured object
}


interface ScriptGeneratorTabProps {
  googleApiKey: string;
  openaiApiKey:string;
}

// Function to parse duration string into seconds
const parseDurationToSeconds = (durationStr: string): number | null => {
  if (!durationStr.trim()) return null;
  
  let totalSeconds = 0;
  
  // Match minutes (phút, minute, min, m)
  const minutesMatches = durationStr.match(/(\d+(\.\d+)?)\s*(phút|minute|min|m)/i);
  if (minutesMatches) {
    totalSeconds += parseFloat(minutesMatches[1]) * 60;
  }

  // Match seconds (giây, second, sec, s)
  const secondsMatches = durationStr.match(/(\d+(\.\d+)?)\s*(giây|second|sec|s)/i);
  if (secondsMatches) {
    totalSeconds += parseFloat(secondsMatches[1]);
  }

  // If no units are found, and it's just a number, assume it's seconds.
  if (totalSeconds === 0 && /^\d+(\.\d+)?$/.test(durationStr.trim())) {
    totalSeconds = parseFloat(durationStr.trim());
  }
  
  return totalSeconds > 0 ? totalSeconds : null;
};

// Helper function to create user-friendly error messages from API responses
const getApiErrorMessage = (error: unknown, provider: string): string => {
    let providerName = provider.charAt(0).toUpperCase() + provider.slice(1);
    if (provider === 'openai') providerName = 'OpenAI';
    
  // Check for CORS/Network error first, as it's a common issue with client-side OpenAI calls
  if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
    return `Lỗi kết nối đến ${providerName}: Trình duyệt của bạn có thể đã chặn yêu cầu do chính sách bảo mật (CORS). Đây là một hạn chế phổ biến khi gọi API trực tiếp từ trang web. Vui lòng thử lại, hoặc sử dụng Google Gemini để đảm bảo ứng dụng hoạt động ổn định.`;
  }

  let message = 'An unknown error occurred during generation.';
  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }

  // Try to parse Google Gemini's JSON-like error messages
  try {
    const jsonMatch = message.match(/\{.*\}/s); // Use 's' flag to match across newlines
    if (jsonMatch && provider === 'google') {
      const errorObj = JSON.parse(jsonMatch[0]);
      const nestedError = errorObj.error || errorObj;

      if (nestedError.status === 'UNAVAILABLE' || nestedError.code === 503) {
        return 'Lỗi từ Google AI: Model đang bị quá tải. Vui lòng thử lại sau ít phút.';
      }
      if (nestedError.message && (nestedError.message.includes('API key not valid') || nestedError.message.includes('API_KEY_INVALID'))) {
        return 'Lỗi API Google: API key không hợp lệ. Vui lòng kiểm tra lại trong tab Profile.';
      }
      if (nestedError.message) {
        // Return a cleaner version of other Google API errors
        return `Lỗi từ Google AI: ${nestedError.message}`;
      }
    }
  } catch (e) {
    // Ignore parsing errors and fall through
  }

  // Check for common OpenAI-compatible error messages
  if (message.includes('Incorrect API key') || message.includes('invalid api key')) {
    return `Lỗi API ${providerName}: API key không hợp lệ. Vui lòng kiểm tra lại trong tab Profile.`;
  }
  if (message.toLowerCase().includes('rate limit')) {
    return `Lỗi API ${providerName}: Bạn đã vượt quá giới hạn sử dụng. Vui lòng thử lại sau hoặc kiểm tra gói cước của bạn.`;
  }
  if (message.toLowerCase().includes('insufficient')) {
    return `Lỗi API ${providerName}: Số dư tài khoản không đủ. Vui lòng kiểm tra và nạp thêm tiền vào tài khoản ${providerName} của bạn.`;
  }
  
  // Fallback for unhandled errors
  return `Không thể tạo kịch bản. Vui lòng kiểm tra API key và prompt. Chi tiết lỗi: ${message}`;
};


const ScriptGeneratorTab: React.FC<ScriptGeneratorTabProps> = ({ googleApiKey, openaiApiKey }) => {
  const [idea, setIdea] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  const [apiProvider, setApiProvider] = useState<'openai' | 'google'>('openai');
  const [scriptType, setScriptType] = useState<string>('KH Viễn tưởng / Triết học');

  const systemInstruction = `**CRITICAL TASK: HYPOTHETICAL SCRIPT AND VEO 3.1 PROMPT GENERATION (JSON ONLY)**

You are a unique creative entity, a fusion of a master playwright, a meticulous historian, and an intrepid traveler through alternate realities. Your sole purpose is to receive my "What If...?" idea and weave it into a detailed, scene-by-scene video script. Your entire output must be a single, valid JSON object, perfectly formatted for a video production workflow using Flow VEO 3.1.

**YOUR CORE METHODOLOGY: THE HYPOTHETICAL NARRATIVE**
- Your script must be structured as a speculative exploration. You will constantly pose "what if" questions and then answer them through the narrative of the scenes, creating a thought-provoking, documentary-style story from a reality that could have been.

**UNBREAKABLE LAWS OF YOUR OUTPUT:**

**LAW #1: THE LAW OF PRECISE SCENE COUNT**
- My request will specify the exact number of scenes required (e.g., "Total Scenes to Generate: 38").
- You MUST generate **EXACTLY** that number of scenes. This is an absolute, non-negotiable mathematical requirement. Any deviation is a critical failure. Each scene represents an 8-second video clip.

**LAW #2: THE LAW OF DETAILED, ENGLISH-ONLY JSON PROMPTS (PURE VISUALS)**
- The 'prompt' field is designed exclusively for the VEO 3.1 video generation AI and **MUST BE A JSON OBJECT**.
- This object must contain six specific keys: \`subject\`, \`action\`, \`setting\`, \`camera_shot\`, \`style\`, and \`sound\`.
- **CRITICAL LANGUAGE RULE:** All values within this 'prompt' object **MUST BE IN ENGLISH. NO VIETNAMESE OR ANY OTHER LANGUAGE IS ALLOWED IN THE PROMPT OBJECT.** This is non-negotiable.
- **ABSOLUTE PROHIBITION:** The values within the 'prompt' object must describe visuals, camera actions, and **ambient environment sounds ONLY**. They must contain **NO DIALOGUE, NO NARRATION, NO ON-SCREEN TEXT, and NO WRITTEN WORDS** of any kind. It is a purely visual and atmospheric guide. Prompts containing text like "a scientist explaining..." or "a book titled..." are strictly forbidden.

**LAW #3: THE LAW OF JSON INTEGRITY AND BILINGUAL CONTENT**
- Your entire response MUST be a single JSON object. Do not include any introductory text, explanations, or markdown formatting like \`\`\`json. Just the raw, valid JSON.
- The root JSON object must contain a single key: \`"scenes"\`, which holds an array of scene objects.
- Each object inside the \`"scenes"\` array must contain exactly three keys with specific language requirements:
    1.  \`"scene"\` (integer): The scene number, starting sequentially from 1.
    2.  \`"description"\` (Vietnamese string): This is the detailed script/narration for the scene. It **MUST be in VIETNAMESE**.
    3.  \`"prompt"\` (JSON object): The detailed, structured visual prompt for the video AI. The entire content of this object **MUST be in ENGLISH**, adhering strictly to LAW #2.

---
**FINAL MANDATORY SELF-CORRECTION CHECK:**
Before outputting, you must verify:
1.  Does the number of scenes in the "scenes" array exactly match the number I requested?
2.  Is every single 'prompt' field a JSON object with the six required keys?
3.  Is every value within every 'prompt' object **written in ENGLISH**?
4.  Is every 'description' field **written in VIETNAMESE**?
5.  Does every value within the 'prompt' object contain ONLY visual and ambient sound descriptions, with zero dialogue or text?
6.  Is the entire output one single, perfectly-formed JSON object and nothing else?
If any check fails, you must correct your response until it perfectly meets all laws.`;

  const handleGenerate = async () => {
    const apiKeys = {
        google: googleApiKey,
        openai: openaiApiKey,
    };
    const providerNames = {
        google: 'Google Gemini',
        openai: 'OpenAI GPT-4o',
    }

    if (!apiKeys[apiProvider]) {
      setError(`Chưa có ${providerNames[apiProvider]} API key. Vui lòng vào tab Profile để thêm key.`);
      return;
    }
    if (!idea.trim()) {
      setError("Please enter a content idea.");
      return;
    }
    if (!selectedDuration) {
      setError("Vui lòng chọn thời lượng video.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setScenes([]);
    setCopiedItems(new Set());

    const totalSeconds = parseDurationToSeconds(selectedDuration);
    if (!totalSeconds) {
        setError("Invalid duration format.");
        setIsGenerating(false);
        return;
    }
    const numberOfScenes = Math.round(totalSeconds / 8);

    let userPrompt = `Generate a script and video prompts based on these details:\n\n- Idea: "${idea}"\n- Script Type: "${scriptType}"\n- Total Scenes to Generate: ${numberOfScenes}`;
    
    const openAISystemInstruction = `${systemInstruction}\n\n**OUTPUT FORMAT (CRITICAL):**\nYour final output must be a single, valid JSON object with one key: "scenes". The value of "scenes" must be an array of objects. Each scene object must contain 'scene', 'description', and 'prompt' keys as described in the main instructions.`;
    
    const callOpenAICompatibleAPI = async (endpoint: string, apiKey: string, model: string) => {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: [
                    { role: 'system', content: openAISystemInstruction },
                    { role: 'user', content: userPrompt }
                ],
                response_format: { type: 'json_object' }
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const jsonText = data.choices[0].message.content;
        return JSON.parse(jsonText);
    };    

    try {
      let parsedResults;
      if (apiProvider === 'google') {
        const ai = new GoogleGenAI({ apiKey: googleApiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: userPrompt,
          config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                scenes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      scene: { type: Type.INTEGER, description: "The scene number, starting from 1." },
                      description: { type: Type.STRING, description: "This is the detailed script/narration for the scene, written in Vietnamese. It should follow a hypothetical 'what if' style." },
                      prompt: {
                        type: Type.OBJECT,
                        description: "A detailed, structured visual prompt for the VEO 3.1 AI. Must be in English. ABSOLUTELY NO text or dialogue.",
                        properties: {
                          subject: { type: Type.STRING, description: "The main subject(s) of the scene. E.g., 'A lone astronaut', 'A bustling futuristic city'."},
                          action: { type: Type.STRING, description: "What the subject is doing or what is happening. E.g., 'walking on a desolate alien planet', 'hover-cars weaving through massive skyscrapers'."},
                          setting: { type: Type.STRING, description: "The environment or background. E.g., 'Two suns setting on the horizon', 'Rain-slicked neon-lit streets at night'."},
                          camera_shot: { type: Type.STRING, description: "The camera angle, movement, or shot type. E.g., 'Dynamic low-angle tracking shot', 'Cinematic aerial drone shot', 'Extreme close-up on a character's eye'."},
                          style: { type: Type.STRING, description: "The overall visual and artistic style. E.g., 'Hyperrealistic, 8K resolution, dramatic cinematic lighting, Unreal Engine 5 aesthetic'."},
                          sound: { type: Type.STRING, description: "Ambient environmental sounds only. E.g., 'The low hum of futuristic machinery and distant sirens', 'The gentle rustle of alien flora and faint, otherworldly chirps'."}
                        },
                        required: ['subject', 'action', 'setting', 'camera_shot', 'style', 'sound']
                      },
                    },
                    required: ['scene', 'description', 'prompt'],
                  },
                }
              },
              required: ['scenes']
            },
          },
        });
        const jsonText = response.text.trim();
        parsedResults = JSON.parse(jsonText);
      } else if (apiProvider === 'openai') {
        parsedResults = await callOpenAICompatibleAPI('https://api.openai.com/v1/chat/completions', openaiApiKey, 'gpt-4o');
      }

      if (!parsedResults || !parsedResults.scenes || !Array.isArray(parsedResults.scenes)) {
        throw new Error(`Invalid response format from ${apiProvider}. Expected a JSON object with a 'scenes' array.`);
      }

      setScenes(parsedResults.scenes || []);

    } catch (e) {
      console.error(e);
      setError(getApiErrorMessage(e, apiProvider));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (prompt: Prompt, sceneNumber: number) => {
    // Combine the structured prompt into a single, effective string for VEO 3.1
    const textToCopy = `${prompt.camera_shot} of ${prompt.subject} ${prompt.action} in ${prompt.setting}, ${prompt.style}. Ambient sounds of ${prompt.sound}.`;

    const textArea = document.createElement("textarea");
    textArea.value = textToCopy;
    textArea.style.position = 'fixed';
    textArea.style.top = '-9999px';
    textArea.style.left = '-9999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      document.execCommand('copy');
      const copyId = `prompt-${sceneNumber}`;
      setCopiedItems(prev => new Set(prev).add(copyId));
    } catch (err) {
      setError(`Could not copy text. Please copy it manually.`);
      setTimeout(() => setError(null), 4000);
    }
    document.body.removeChild(textArea);
  };
  
  const handleDownloadPrompts = () => {
    const promptsText = scenes.map(scene => {
      const p = scene.prompt;
      // Combine the structured prompt into a single string for the text file
      const combinedPrompt = `${p.camera_shot} of ${p.subject} ${p.action} in ${p.setting}, ${p.style}. Ambient sounds of ${p.sound}.`;
      return `SCENE ${scene.scene}:\n${combinedPrompt}\n\n`;
    }).join('');
    const blob = new Blob([promptsText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generated_prompts.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  const handleDownloadScript = () => {
    const scriptObject = {
        scenes: scenes
    }
    const jsonString = JSON.stringify(scriptObject, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generated_script.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const scriptTypes = [
    'KH Viễn tưởng / Triết học', 
    'Lịch sử Giả tưởng', 
    'Kinh dị / Sinh tồn', 
    'Thảm họa Tự nhiên', 
    'Tiền sử / Huyền bí', 
    'Xã hội / Chính trị', 
  ];

  const durationOptions = [
    '5 phút', '8 phút', '10 phút', '12 phút', '15 phút', '20 phút', 
    '25 phút', '30 phút', '40 phút', '50 phút', '60 phút', '90 phút'
  ];

  return (
    <div className="space-y-6">
      {/* Inputs and Config Section */}
      <div className="space-y-4 bg-slate-900/50 p-4 rounded-lg border border-slate-700">
        <div>
          <label className="block text-sm font-semibold mb-1">1. Chọn loại kịch bản</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 rounded-lg bg-slate-800 p-2 border border-slate-700">
            {scriptTypes.map((type) => (
              <Button
                key={type}
                variant={scriptType === type ? 'active' : 'secondary'}
                onClick={() => setScriptType(type)}
                className="w-full text-[11px] sm:text-xs py-2.5"
                disabled={isGenerating}
              >
                {type}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">2. Chọn AI Model</label>
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-800 p-1 border border-slate-700">
            <Button 
              variant={apiProvider === 'openai' ? 'active' : 'secondary'} 
              onClick={() => setApiProvider('openai')}
              className="flex-1 text-xs sm:text-sm"
              disabled={isGenerating}
            >
              OpenAI GPT-4o
            </Button>
            <Button 
              variant={apiProvider === 'google' ? 'active' : 'secondary'} 
              onClick={() => setApiProvider('google')}
              className="flex-1 text-xs sm:text-sm"
              disabled={isGenerating}
            >
              Google Gemini
            </Button>
          </div>
        </div>
        <div>
          <label htmlFor="idea-textarea" className="block text-sm font-semibold mb-1">
            3. Nhập ý tưởng "Nếu như...?"
          </label>
          <textarea
            id="idea-textarea"
            className="w-full h-40 bg-slate-800 border border-slate-600 rounded-md p-3 text-base text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            placeholder="Ví dụ: Điều gì sẽ xảy ra nếu con người có thể giao tiếp với động vật?"
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            disabled={isGenerating}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold mb-1">4. Cài đặt thời lượng Video</label>
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 rounded-lg bg-slate-800 p-2 border border-slate-700">
            {durationOptions.map((d) => (
                <Button
                    key={d}
                    variant={selectedDuration === d ? 'active' : 'secondary'}
                    onClick={() => setSelectedDuration(prev => prev === d ? '' : d)}
                    className="w-full text-[11px] sm:text-xs py-2"
                    disabled={isGenerating}
                >
                    {d}
                </Button>
            ))}
          </div>
        </div>
        <Button
          variant="primary"
          className="w-full text-lg py-3"
          onClick={handleGenerate}
          disabled={isGenerating || !idea.trim() || !selectedDuration}
        >
          {isGenerating ? (
            <span className="flex items-center justify-center">
              <Spinner /> Generating...
            </span>
          ) : '5. Tạo kịch bản & Prompt'}
        </Button>
      </div>
      
      {/* Output Section */}
      <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 min-h-[300px] flex flex-col">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-bold text-white">Kết quả</h3>
          {scenes.length > 0 && (
            <div className="flex items-center space-x-2">
              <Button onClick={handleDownloadPrompts} variant="secondary" className="text-xs py-1">
                Download Prompts (.txt)
              </Button>
              <Button onClick={handleDownloadScript} variant="secondary" className="text-xs py-1">
                Download Kịch bản (.json)
              </Button>
            </div>
          )}
        </div>
        <div className="flex-grow overflow-y-auto space-y-3 pr-2">
          {isGenerating && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                  <Spinner />
                  <p className="mt-2 text-cyan-400">AI đang viết, vui lòng chờ...</p>
                  <p className="text-xs text-gray-500 mt-1">Quá trình này có thể mất một lúc.</p>
              </div>
          )}
          {error && <ErrorDisplay message={error} />}
          
          {!isGenerating && scenes.length > 0 && (
              <div className="mb-4 p-3 bg-slate-800 border-l-4 border-cyan-500 rounded-r-lg">
                  <h4 className="font-bold text-sm text-cyan-400">Quy trình làm việc được đề xuất:</h4>
                  <ol className="list-decimal list-inside text-xs text-gray-300 mt-2 space-y-1">
                      <li>Tải xuống file <b className="text-blue-300">"Kịch bản" (.json)</b> để lưu trữ hoặc file <b className="text-yellow-300">"Prompts" (.txt)</b> để sử dụng ngay.</li>
                      <li>Sử dụng <b className="text-yellow-300">"Câu lệnh (Prompt)"</b> cho từng cảnh để tạo các video tương ứng (mỗi video 8 giây) với âm thanh môi trường trong Flow VEO 3.1.</li>
                      <li>Dùng phần mềm chỉnh sửa video để ghép các video đã tạo thành một câu chuyện hoàn chỉnh. Bạn có thể thêm nhạc nền hoặc lồng tiếng của riêng mình ở bước này.</li>
                  </ol>
              </div>
          )}

          {!isGenerating && scenes.length === 0 && !error && (
            <p className="text-center text-gray-500 pt-8">Kịch bản và prompt được tạo sẽ xuất hiện ở đây.</p>
          )}
          
          {scenes.map((scene) => {
            const isPromptCopied = copiedItems.has(`prompt-${scene.scene}`);
            return (
                <div key={scene.scene} className="bg-slate-800 border border-slate-700 p-3 rounded-lg space-y-4">
                  <h4 className="font-bold text-cyan-400">Cảnh {scene.scene}</h4>
                  <div>
                      <h5 className="text-sm font-semibold text-gray-100">Mô tả cảnh:</h5>
                      <p className="text-sm text-gray-300 mt-1">{scene.description}</p>
                  </div>
                  <div>
                      <div className="flex justify-between items-center mb-1">
                          <h5 className="text-sm font-semibold text-yellow-300">Câu lệnh - Prompt (Cho VEO 3.1)</h5>
                          <button 
                              onClick={() => handleCopy(scene.prompt, scene.scene)} 
                              className={`font-bold py-2 px-4 text-sm rounded-lg transition-all duration-300 w-32 text-center ${
                                  isPromptCopied 
                                  ? 'bg-green-600 text-white cursor-default' 
                                  : 'bg-slate-700 hover:bg-slate-600 text-white'
                              }`}
                              aria-label={`Copy prompt for scene ${scene.scene}`}
                              disabled={isPromptCopied}
                          >
                              {isPromptCopied ? 'Đã chép!' : 'Copy Prompt'}
                          </button>
                      </div>
                      <div className="bg-slate-900 rounded-md font-mono text-xs text-yellow-300 p-2 overflow-x-auto">
                        <pre className="whitespace-pre-wrap break-words">
                          {JSON.stringify(scene.prompt, null, 2)}
                        </pre>
                      </div>
                  </div>
                </div>
            );
        })}
        </div>
      </div>
    </div>
  );
};

const Spinner = () => (
    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

const ErrorDisplay: React.FC<{ message: string }> = ({ message }) => (
    <div className="p-4 bg-red-900/50 border border-red-500 rounded-lg text-center">
        <p className="text-red-400 text-sm font-semibold">Error</p>
        <p className="text-xs text-red-300 mt-1">{message}</p>
    </div>
);

export default ScriptGeneratorTab;
