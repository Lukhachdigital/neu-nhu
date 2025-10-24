
import React, { useState } from 'react';
import { GoogleGenAI, Type } from '@google/genai';
import Button from './shared/Button';
import Input from './shared/Input';

interface Scene {
  scene: number;
  description: string;
  prompt: string;
}

interface ScriptGeneratorTabProps {
  googleApiKey: string;
  openaiApiKey: string;
  grokApiKey: string;
  deepseekApiKey: string;
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


const ScriptGeneratorTab: React.FC<ScriptGeneratorTabProps> = ({ googleApiKey, openaiApiKey, grokApiKey, deepseekApiKey }) => {
  const [idea, setIdea] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('');
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [fullVoiceover, setFullVoiceover] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedItems, setCopiedItems] = useState<Set<string>>(new Set());
  const [apiProvider, setApiProvider] = useState<'google' | 'openai' | 'grok' | 'deepseek'>('google');
  const [scriptType, setScriptType] = useState<string>('KH Viễn tưởng / Triết học');

  const systemInstruction = `You are a master storyteller—a novelist, playwright, and philosopher—crafting scripts for the YouTube channel "Nếu Như?". Your mission is to weave terrifying, thought-provoking narratives that explore the deepest "what if" questions. Your style must be captivating, pulling the audience into a chilling speculative journey from which they can't look away.

**CHANNEL THEME:**
The channel delves into terrifying hypothetical questions that challenge our perception of reality: *what if, philosophical horror, cosmic dread, alternate histories, scientific nightmares, existential questions.* Your goal is to make the audience feel the chilling implications of the scenario.

**OUTPUT STRUCTURE (CRITICAL):**
Your entire output must be a single JSON object with two main keys: "full_voiceover" and "scenes".
1.  **'full_voiceover' (String):** This is the complete, continuous narration for the entire video. It must be in VIETNAMESE. CRITICALLY, you must calculate the length of this text so that when read at a normal, engaging speaking pace, it fits the user's requested video duration. Your writing style must be natural, conversational, and use perfect punctuation (commas, periods, pauses) so it can be fed directly into a Text-to-Speech AI without any modifications. This is the single source for the final audio track.
2.  **'scenes' (Array of Objects):** This is an array of scene objects. Each scene object corresponds to a part of the 'full_voiceover' and describes the visuals for it.

**SCENE & DURATION CALCULATION (ABSOLUTELY CRITICAL):**
- **Each scene you generate will be turned into an 8-second video clip.** This is a fixed, non-negotiable rule.
- You MUST calculate the total number of scenes required based on the user's requested video duration.
- **Formula:** Total Scenes = (Total Duration in Seconds) / 8.
- **Example:** For a 5-minute (300 seconds) video, you must generate approximately 37-38 scenes. A script with only 5 or 6 scenes for a 5-minute video is a complete failure and does not follow instructions.
- The 'full_voiceover' must be divided logically across this calculated number of scenes.

**SCENE OBJECT REQUIREMENTS:**
For each scene object in the 'scenes' array, provide:
1.  **'description' (VIETNAMESE):** A summary of what happens in this scene.
2.  **'prompt' (ENGLISH):** A text prompt for the VEO 3.1 video generation AI.

**CRITICAL REQUIREMENTS FOR CONTENT:**
1.  **Language:**
    - 'full_voiceover' and 'description' MUST be in VIETNAMESE.
    - 'prompt' MUST be in ENGLISH.
2.  **Prompt Content for VEO 3.1 (VISUALS & AUDIO):**
    - The 'prompt' MUST be a simple, single string of text.
    - It must create visually stunning, epic, and hyper-realistic scenes that amplify the horror and philosophical depth of the script type.
      - **KH Viễn tưởng / Triết học:** Describe unsettling futuristic tech, vast and lonely cosmic landscapes that evoke dread, epic scale highlighting humanity's insignificance, haunting symbolic imagery, and terrifyingly introspective scenes.
      - **Lịch sử Giả tưởng:** Describe historically accurate settings twisted into a nightmarish version, dramatic and unsettlingly cinematic.
      - **Kinh dị / Sinh tồn:** Evoke visceral dread, oppressive isolation, and imminent danger through visuals. Use atmospheric, deeply unsettling descriptions.
      - **Thảm họa Tự nhiên:** Describe massive-scale destruction as an uncaring, terrifying force of nature, awe-inspiring yet horrifyingly chaotic scenes.
      - **Tiền sử / Huyền bí:** Describe primal, brutal landscapes, terrifyingly giant dinosaurs, disturbing ancient rituals, and mythical beings of raw, incomprehensible power.
      - **Xã hội / Chính trị:** Describe scenes reflecting terrifying societal shifts: ghost-like empty stock markets, massive, frenzied protests, cold and dystopian surveillance. Use powerful, disturbing symbolic imagery.
    - **CRITICAL AUDIO RULE (ABSOLUTE REQUIREMENT):** The 'prompt' MUST NOT contain any dialogue or human speech under any circumstances. Its sole purpose is to describe visuals and **AMBIENT/ENVIRONMENTAL SOUNDS**.
        - **AMBIENT SOUNDS ARE PRIORITY:** Always include rich descriptions of environmental sounds that enhance the feeling of horror or loneliness (e.g., "haunting wind," "unsettling creaking metal," "distant, distorted sirens").
        - **WHAT TO AVOID:** The prompt must never contain any form of dialogue, character speech, narration, or text that is meant to be spoken. All spoken content is exclusively handled by the single Vietnamese 'full_voiceover'.
3.  **Contextual Freedom:** You have complete creative freedom to choose the setting (locations, character ethnicities, cultural elements) that best serves the terrifying narrative. The context should be compelling and internally consistent throughout the script.
4.  **FINAL SCENE REQUIREMENT (CRITICAL):**
    The very last scene of every script MUST be a direct question to the audience. This question should be thought-provoking, directly related to the video's theme, and designed to encourage comments and discussion. For example: "Bạn sẽ làm gì nếu ở trong tình huống đó? Hãy cho chúng tôi biết suy nghĩ của bạn." (What would you do in that situation? Let us know your thoughts.)

**EXAMPLE OUTPUT (User Idea: "What if all water disappeared?", Duration: "30 seconds", Type: "Thảm họa Tự nhiên"):**
{
  "full_voiceover": "Nước, thứ mà ta coi là hiển nhiên, đã phản bội chúng ta bằng cách biến mất. Vịnh Hạ Long giờ đây là một sa mạc đá, một lời nhắc nhở lạnh lẽo về sự mong manh của chúng ta. Các thành phố lớn, từng nhộn nhịp, giờ im lặng đến chết chóc. Sông Thames chỉ còn là một vết sẹo trên mặt đất, và những con tàu nằm chỏng chơ như những bộ xương khổng lồ. Con người, tuyệt vọng, tìm kiếm những giọt cuối cùng, nhưng chỉ tìm thấy bụi và tuyệt vọng. Bạn có nghĩ rằng, chúng ta có thể tồn tại trong một thế giới như vậy không?",
  "scenes": [
    {
      "scene": 1,
      "description": "Vịnh Hạ Long, kỳ quan thiên nhiên thế giới, giờ đây trơ trọi một cách đáng sợ. Hàng ngàn hòn đảo đá vôi hùng vĩ đứng sừng sững trên một lòng vịnh khô cằn, nứt nẻ, thay vì mặt nước xanh biếc.",
      "prompt": "hyper-realistic, 4k, cinematic drone shot panning across the dried-up Ha Long Bay, thousands of limestone karsts stand on a cracked, arid seabed under a harsh sun, sound of a haunting, howling wind echoing between the stone pillars, dust devils swirling ominously."
    },
    {
      "scene": 2,
      "description": "Thành phố London hoang tàn, sông Thames đã hoàn toàn khô cạn, để lộ ra lòng sông nứt nẻ. Những con tàu du lịch và thuyền bè nằm nghiêng ngả trên bùn đất khô cứng.",
      "prompt": "hyper-realistic, 4k, cinematic shot of a deserted London, the River Thames is a massive, cracked trench, boats and ships lie stranded on the dry riverbed, a thick haze of dust hangs in the air, sound of desolate wind and the creaking of metal."
    },
    {
       "scene": 3,
       "description": "Một cảnh quay cận cảnh những bàn tay nứt nẻ, tuyệt vọng cào vào lớp đất khô trong một hồ chứa nước đã cạn kiệt, tìm kiếm độ ẩm một cách vô ích.",
       "prompt": "hyper-realistic, 4k, dramatic close-up shot of cracked, dirty hands desperately digging into dry, parched earth at the bottom of an empty reservoir, the only sound is the scraping of dirt and hopeless, heavy breathing."
    },
    {
       "scene": 4,
       "description": "Một câu hỏi hiện ra trên màn hình đen, mời gọi sự tương tác của khán giả.",
       "prompt": "Text on a black screen: 'Do you think humanity could survive in a world like this?' with subtle, ominous background music fading in."
    }
  ]
}`;

  const handleGenerate = async () => {
    const apiKeys = {
        google: googleApiKey,
        openai: openaiApiKey,
        grok: grokApiKey,
        deepseek: deepseekApiKey,
    };
    const providerNames = {
        google: 'Google Gemini',
        openai: 'Chat GPT',
        grok: 'Grok',
        deepseek: 'Deepseek'
    }

    if (!apiKeys[apiProvider]) {
      setError(`Chưa có ${providerNames[apiProvider]} API key. Vui lòng vào tab Profile để thêm key.`);
      return;
    }
    if (!idea.trim()) {
      setError("Please enter a content idea.");
      return;
    }

    setIsGenerating(true);
    setError(null);
    setScenes([]);
    setFullVoiceover('');
    setCopiedItems(new Set());

    let userPrompt = `Generate a script and video prompts based on these details:\n\nIdea: "${idea}"\nScript Type: "${scriptType}"`;
    if (selectedDuration) {
        const totalSeconds = parseDurationToSeconds(selectedDuration);
        const requiredScenes = Math.round(totalSeconds / 8);
        userPrompt += `\n\nCRITICAL DURATION & SCENE REQUIREMENT:\n- Video Duration: ${selectedDuration} (which is ${totalSeconds} seconds).\n- Each scene corresponds to an 8-second video clip.\n- Therefore, you MUST generate approximately ${requiredScenes} scenes for this script.\n- The 'full_voiceover' must be timed to last for ${totalSeconds} seconds and be split across these ${requiredScenes} scenes. Do not generate fewer scenes. This is the most important instruction.`;
    } else {
        userPrompt += `\n\nDesired Video Duration: "not specified". Generate a reasonable number of scenes for a short video, assuming each scene is 8 seconds.`;
    }

    const openAISystemInstruction = `${systemInstruction}\n\n**OUTPUT FORMAT (CRITICAL):**\nYour final output must be a single, valid JSON object with two keys: "full_voiceover" and "scenes". The value of "full_voiceover" must be a single string. The value of "scenes" must be an array of objects. Each scene object must contain 'scene', 'description', and 'prompt' keys as described in the main instructions.`;
    
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
                full_voiceover: {
                  type: Type.STRING,
                  description: "A single, continuous VIETNAMESE voiceover script for the entire video. Its length must be calculated to match the user's requested video duration when read at a normal pace."
                },
                scenes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      scene: { type: Type.INTEGER, description: "The scene number, starting from 1." },
                      description: { type: Type.STRING, description: "A VIETNAMESE description of what happens in this scene." },
                      prompt: { type: Type.STRING, description: "A simple, realistic, ENGLISH text prompt for the video generation AI (visuals and ambient sound only)." },
                    },
                    required: ['scene', 'description', 'prompt'],
                  },
                }
              },
              required: ['full_voiceover', 'scenes']
            },
          },
        });
        const jsonText = response.text.trim();
        parsedResults = JSON.parse(jsonText);
      } else if (apiProvider === 'openai') {
        parsedResults = await callOpenAICompatibleAPI('https://api.openai.com/v1/chat/completions', openaiApiKey, 'gpt-4o');
      } else if (apiProvider === 'grok') {
        parsedResults = await callOpenAICompatibleAPI('https://api.groq.com/openai/v1/chat/completions', grokApiKey, 'llama-3.1-70b-versatile');
      } else if (apiProvider === 'deepseek') {
        parsedResults = await callOpenAICompatibleAPI('https://api.deepseek.com/v1/chat/completions', deepseekApiKey, 'deepseek-chat');
      }

      if (!parsedResults || !parsedResults.scenes || !Array.isArray(parsedResults.scenes) || typeof parsedResults.full_voiceover !== 'string') {
        throw new Error(`Invalid response format from ${apiProvider}. Expected a 'scenes' array and a 'full_voiceover' string.`);
      }

      setFullVoiceover(parsedResults.full_voiceover || '');
      setScenes(parsedResults.scenes || []);

    } catch (e) {
      console.error(e);
      setError(getApiErrorMessage(e, apiProvider));
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (text: string, sceneNumber: number) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
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
    const promptsText = scenes.map(scene => `SCENE ${scene.scene}:\n${scene.prompt}\n\n`).join('');
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
  
  const handleDownloadVoiceover = () => {
    const blob = new Blob([fullVoiceover], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'full_voiceover_script.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadScript = () => {
    const scriptObject = {
        full_voiceover: fullVoiceover,
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-lg bg-slate-800 p-1 border border-slate-700">
            <Button 
              variant={apiProvider === 'google' ? 'active' : 'secondary'} 
              onClick={() => setApiProvider('google')}
              className="flex-1 text-xs sm:text-sm"
              disabled={isGenerating}
            >
              Google Gemini
            </Button>
            <Button 
              variant={apiProvider === 'openai' ? 'active' : 'secondary'} 
              onClick={() => setApiProvider('openai')}
              className="flex-1 text-xs sm:text-sm"
              disabled={isGenerating}
            >
              OpenAI GPT-4o
            </Button>
            <Button 
              variant={apiProvider === 'grok' ? 'active' : 'secondary'} 
              onClick={() => setApiProvider('grok')}
              className="flex-1 text-xs sm:text-sm"
              disabled={isGenerating}
            >
              Grok Llama 3
            </Button>
            <Button 
              variant={apiProvider === 'deepseek' ? 'active' : 'secondary'} 
              onClick={() => setApiProvider('deepseek')}
              className="flex-1 text-xs sm:text-sm"
              disabled={isGenerating}
            >
              Deepseek
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
          <label className="block text-sm font-semibold mb-1">4. Cài đặt thời lượng Video (tùy chọn)</label>
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
          disabled={isGenerating || !idea.trim()}
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
                Download Kịch bản
              </Button>
            </div>
          )}
        </div>
        <div className="flex-grow overflow-y-auto space-y-3 pr-2">
          {isGenerating && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                  <Spinner />
                  <p className="mt-2 text-cyan-400">AI is writing, please wait...</p>
                  <p className="text-xs text-gray-500 mt-1">This may take a moment.</p>
              </div>
          )}
          {error && <ErrorDisplay message={error} />}
          
          {!isGenerating && scenes.length > 0 && (
            <>
              <div className="mb-4 p-3 bg-slate-800 border-l-4 border-cyan-500 rounded-r-lg">
                  <h4 className="font-bold text-sm text-cyan-400">Quy trình làm việc được đề xuất:</h4>
                  <ol className="list-decimal list-inside text-xs text-gray-300 mt-2 space-y-1">
                      <li>Tải xuống file <b className="text-green-300">"Nội dung Voice"</b> và sử dụng một công cụ AI Text-to-Speech (chuyển văn bản thành giọng nói) để tạo 1 file audio duy nhất.</li>
                      <li>Sử dụng <b className="text-yellow-300">"Câu lệnh (Prompt)"</b> cho từng cảnh để tạo các video tương ứng với âm thanh môi trường trong VEO 3.1.</li>
                      <li>Dùng phần mềm chỉnh sửa video để ghép file audio lồng tiếng vào chuỗi video đã tạo.</li>
                  </ol>
              </div>
               {fullVoiceover && (
                <div className="mb-4 p-3 bg-slate-800 border-l-4 border-green-500 rounded-r-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-lg text-green-300">Toàn bộ nội dung Voice</h4>
                    <Button onClick={handleDownloadVoiceover} variant="secondary" className="text-xs py-1.5 px-3">
                      Download Voice (.txt)
                    </Button>
                  </div>
                  <p className="text-sm text-gray-200 mt-2 whitespace-pre-wrap italic">"{fullVoiceover}"</p>
                </div>
              )}
            </>
          )}

          {!isGenerating && scenes.length === 0 && !error && (
            <p className="text-center text-gray-500 pt-8">The generated script and prompts will appear here.</p>
          )}
          
          {scenes.map((scene) => {
            const isPromptCopied = copiedItems.has(`prompt-${scene.scene}`);
            return (
                <div key={scene.scene} className="bg-slate-800 border border-slate-700 p-3 rounded-lg space-y-3">
                <h4 className="font-bold text-cyan-400">Cảnh {scene.scene}</h4>
                <div>
                    <h5 className="text-sm font-semibold text-gray-100">Mô tả cảnh:</h5>
                    <p className="text-sm text-gray-300 mt-1">{scene.description}</p>
                </div>
                <div>
                    <div className="flex justify-between items-center mb-1">
                    <h5 className="text-sm font-semibold text-yellow-300">Câu lệnh - Prompt</h5>
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
                    <div className="bg-slate-900 rounded-md font-mono text-xs text-yellow-300 p-2">
                    <p className="whitespace-pre-wrap break-words">{scene.prompt}</p>
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