
import React, { useState, useRef, useEffect } from 'react';
import { processStudyNote, generateQuiz } from './services/geminiService';
import { NoteContent, QuizSet, QuizSettings } from './types';
import MindMap from './components/MindMap';
import ExamPlanner from './components/ExamPlanner';
import QuizView from './components/QuizView';
import { GoogleGenAI } from "@google/genai";

interface UserProfile {
  name: string;
  avatar: string;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

const CLASSIC_UNITS = [
  { id: 'math-1', title: '一元一次方程式', icon: '🔢' },
  { id: 'chinese-1', title: '朱自清《背影》', icon: '📖' },
  { id: 'english-1', title: '國中英文：現在進行式', icon: '🇬🇧' },
  { id: 'science-1', title: '光學：折射與反射', icon: '💡' },
];

const App: React.FC = () => {
  const [profile, setProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('sino_user_profile');
    return saved ? JSON.parse(saved) : { name: '學習者', avatar: '' };
  });
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'notes' | 'planner' | 'quiz_hub' | 'ai_tutor' | 'active_quiz'>('notes');
  
  // 筆記狀態
  const [inputValue, setInputValue] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [docLink, setDocLink] = useState('');
  const [showDocInput, setShowDocInput] = useState(false);

  // 測驗狀態
  const [quizImage, setQuizImage] = useState<string | null>(null);
  const [quizDocLink, setQuizDocLink] = useState('');
  const [showQuizDocInput, setShowQuizDocInput] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [quizLoading, setQuizLoading] = useState(false);
  const [note, setNote] = useState<NoteContent | null>(null);
  const [quizSet, setQuizSet] = useState<QuizSet | null>(null);

  const [quizSettings, setQuizSettings] = useState<QuizSettings>({
    level: '國中',
    difficulty: '普通',
    questionCount: 5,
    timeLimit: 10
  });

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'model', text: '你好！我是你的 AI 老師。你可以上傳筆記照片、文檔連結或直接問我問題喔！✨' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [customQuizTopic, setCustomQuizTopic] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const quizImageRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('sino_user_profile', JSON.stringify(profile));
  }, [profile]);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setProfile(prev => ({ ...prev, avatar: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  const handleProcess = async () => {
    if (!inputValue && !image && !docLink) {
      alert('請輸入內容、上傳圖片或提供文檔連結。');
      return;
    }
    setLoading(true);
    try {
      const base64Data = image ? image.split(',')[1] : undefined;
      // 組合提示訊息：如果包含連結，則加入提示
      const fullInput = docLink ? `${inputValue}\n[文檔連結]: ${docLink}` : inputValue;
      const result = await processStudyNote(fullInput, base64Data);
      setNote(result);
    } catch (error: any) {
      alert(error.message || '分析失敗，請檢查 API Key 或網路。');
    } finally {
      setLoading(false);
    }
  };

  const handleStartQuiz = async (topic: string, isFromUnit = false) => {
    if (!isFromUnit && !topic.trim() && !quizImage && !quizDocLink) {
      alert('請提供主題、照片或文檔連結以供 AI 出題。');
      return;
    }
    
    setQuizLoading(true);
    try {
      const base64Data = quizImage ? quizImage.split(',')[1] : undefined;
      const fullTopic = quizDocLink ? `${topic} (參考文檔: ${quizDocLink})` : topic;
      const result = await generateQuiz(fullTopic, quizSettings, base64Data);
      setQuizSet(result);
      setActiveTab('active_quiz');
      setCustomQuizTopic('');
      setQuizImage(null);
      setQuizDocLink('');
    } catch (error: any) {
      alert(error.message || '出題失敗！可能是連結無權限或內容不足。');
    } finally {
      setQuizLoading(false);
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || chatLoading) return;
    const userMsg = { role: 'user', text: chatInput };
    setChatMessages(prev => [...prev, userMsg as ChatMessage]);
    setChatInput('');
    setChatLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: chatInput,
        config: { systemInstruction: `你是一位全能且親切的 AI 老師，名叫 Sino。` }
      });
      setChatMessages(prev => [...prev, { role: 'model', text: response.text || '...' }]);
    } catch (error) {
      setChatMessages(prev => [...prev, { role: 'model', text: '抱歉，系統連線異常。' }]);
    } finally {
      setChatLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col">
      <header className="sticky top-0 z-[100] bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white text-xl shadow-indigo-100 shadow-lg font-black">S</div>
          <h1 className="text-xl font-black text-slate-800 tracking-tight">Sino Study AI</h1>
        </div>
        <button onClick={() => setShowSettings(true)} className="flex items-center gap-3 bg-slate-100 hover:bg-slate-200 p-1 rounded-full transition-all border border-slate-200">
          <img src={profile.avatar || `https://ui-avatars.com/api/?name=${profile.name}`} className="w-8 h-8 rounded-full object-cover border-2 border-white" alt="U" />
          <span className="text-sm font-bold text-slate-700 pr-3">{profile.name}</span>
        </button>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 pb-32">
        {activeTab === 'active_quiz' && quizSet ? (
          <QuizView quizSet={quizSet} onClose={() => setActiveTab('quiz_hub')} />
        ) : activeTab === 'notes' ? (
          <div className="space-y-6 animate-slide-in">
            <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
              <h2 className="text-lg font-black text-slate-800 mb-4 flex items-center gap-2"><span>📓</span> 擷取知識重點</h2>
              <textarea className="w-full h-32 p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-slate-700 font-medium placeholder:text-slate-300 transition-all" placeholder="貼上課文、重點內容，或上傳附件..." value={inputValue} onChange={(e) => setInputValue(e.target.value)} />
              
              {showDocInput && (
                <div className="mt-3 animate-in slide-in-from-top-2 duration-200">
                  <input type="text" value={docLink} onChange={e => setDocLink(e.target.value)} placeholder="貼上 Google 雲端文檔或 PDF 連結..." className="w-full p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-sm font-bold outline-none text-indigo-700 placeholder:text-indigo-300 shadow-inner" />
                </div>
              )}

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setImage(reader.result as string);
                    reader.readAsDataURL(file);
                  }
                }}/>
                <button onClick={() => fileInputRef.current?.click()} className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 text-sm font-bold transition-all border border-slate-200">📷 圖片</button>
                <button onClick={() => setShowDocInput(!showDocInput)} className={`px-5 py-2.5 rounded-xl text-sm font-bold transition-all border flex items-center gap-2 ${docLink ? 'bg-indigo-600 text-white border-indigo-500' : 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'}`}>
                  📄 文檔/雲端 {docLink && '✓'}
                </button>

                {image && (
                  <div className="relative group">
                    <img src={image} className="w-10 h-10 object-cover rounded-lg border border-slate-200" alt="P" />
                    <button onClick={() => setImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-[10px]">✕</button>
                  </div>
                )}
                <button onClick={handleProcess} disabled={loading} className="ml-auto bg-indigo-600 text-white px-8 py-2.5 rounded-xl font-black shadow-lg shadow-indigo-100 disabled:opacity-50 transition-all hover:bg-indigo-700 active:scale-95">
                  {loading ? '分析中...' : '生成彩色筆記'}
                </button>
              </div>
            </div>
            {note && (
              <div className="space-y-6">
                <div className="bg-[#fff9e6] p-6 rounded-[2rem] border-l-8 border-yellow-400 shadow-md">
                  <h2 className="text-2xl font-black mb-4 text-slate-800">{note.title}</h2>
                  <p className="text-slate-700 font-medium mb-6 italic opacity-80">"{note.summary}"</p>
                  <ul className="space-y-3">
                    {note.keyPoints.map((p, i) => (
                      <li key={i} className="flex gap-3 text-slate-700 font-bold bg-white/50 p-3 rounded-xl border border-white/50">
                        <span className="w-6 h-6 bg-indigo-500 text-white rounded-lg flex items-center justify-center text-xs flex-shrink-0 font-black">{i+1}</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                <MindMap data={note.mindMap} />
              </div>
            )}
          </div>
        ) : activeTab === 'planner' ? (
          <ExamPlanner />
        ) : activeTab === 'ai_tutor' ? (
          <div className="h-[calc(100vh-280px)] flex flex-col bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl font-bold text-sm leading-relaxed ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-br-none' : 'bg-slate-100 text-slate-700 rounded-bl-none shadow-sm'}`}>{msg.text}</div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div className="p-4 border-t bg-slate-50">
              <div className="flex gap-2 bg-white p-2 rounded-2xl shadow-inner border border-slate-100">
                <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && sendChatMessage()} className="flex-1 bg-transparent px-4 outline-none font-bold text-sm" placeholder="問問 Sino 任何功課..." />
                <button onClick={sendChatMessage} className="bg-indigo-600 text-white px-5 py-2 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md">送出</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-6 animate-slide-in">
             <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                <div className="mb-6"><h2 className="text-xl font-black text-slate-800">🎯 測驗中心</h2><p className="text-slate-400 font-bold text-sm">點擊單元或自訂內容開始測驗</p></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {CLASSIC_UNITS.map(unit => (
                    <button key={unit.id} onClick={() => handleStartQuiz(unit.title, true)} className="flex items-center gap-4 p-5 bg-slate-50 hover:bg-indigo-50 rounded-2xl border border-slate-100 transition-all text-left group active:scale-95 shadow-sm">
                      <span className="text-3xl group-hover:scale-110 transition-transform">{unit.icon}</span>
                      <div><span className="block font-black text-slate-700">{unit.title}</span><span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">Start Quiz</span></div>
                    </button>
                  ))}
                </div>
             </div>

             <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-[2rem] p-8 text-white shadow-xl shadow-indigo-100 relative overflow-hidden">
                <div className="relative z-10 space-y-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-black mb-1 italic">🤔 自訂測驗資源</h3>
                      <p className="text-indigo-100 text-xs font-bold opacity-80">輸入主題、拍照或貼上雲端文檔連結。</p>
                    </div>
                    <span className="text-4xl opacity-20">✍️</span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-indigo-200 px-1">年級</p>
                      <select value={quizSettings.level} onChange={e => setQuizSettings(s => ({...s, level: e.target.value}))} className="w-full bg-white/10 text-white rounded-lg p-2 text-xs font-bold outline-none border border-white/20">
                        {['國小', '國中', '高中'].map(l => <option key={l} value={l} className="text-slate-800">{l}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-indigo-200 px-1">難度</p>
                      <select value={quizSettings.difficulty} onChange={e => setQuizSettings(s => ({...s, difficulty: e.target.value as any}))} className="w-full bg-white/10 text-white rounded-lg p-2 text-xs font-bold outline-none border border-white/20">
                        {['簡單', '普通', '困難'].map(d => <option key={d} value={d} className="text-slate-800">{d}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-indigo-200 px-1">題數</p>
                      <select value={quizSettings.questionCount} onChange={e => setQuizSettings(s => ({...s, questionCount: Number(e.target.value)}))} className="w-full bg-white/10 text-white rounded-lg p-2 text-xs font-bold outline-none border border-white/20">
                        {[5, 10, 15, 20].map(n => <option key={n} value={n} className="text-slate-800">{n} 題</option>)}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase text-indigo-200 px-1">限時</p>
                      <select value={quizSettings.timeLimit} onChange={e => setQuizSettings(s => ({...s, timeLimit: Number(e.target.value)}))} className="w-full bg-white/10 text-white rounded-lg p-2 text-xs font-bold outline-none border border-white/20">
                        {[5, 10, 20, 30].map(t => <option key={t} value={t} className="text-slate-800">{t} m</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <div className="flex flex-wrap gap-2">
                       <button onClick={() => quizImageRef.current?.click()} className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${quizImage ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}>
                        {quizImage ? '📸 已加入照片' : '📷 拍照出題'}
                       </button>
                       <button onClick={() => setShowQuizDocInput(!showQuizDocInput)} className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 ${quizDocLink ? 'bg-sky-500 text-white border-sky-400' : 'bg-white/10 text-white border-white/20 hover:bg-white/20'}`}>
                        {quizDocLink ? '🔗 已加入連結' : '🔗 雲端/文檔'}
                       </button>
                       <input type="file" ref={quizImageRef} accept="image/*" className="hidden" onChange={(e) => {
                         const file = e.target.files?.[0];
                         if (file) {
                           const reader = new FileReader();
                           reader.onloadend = () => setQuizImage(reader.result as string);
                           reader.readAsDataURL(file);
                         }
                       }} />
                       {quizImage && <div className="relative"><img src={quizImage} className="w-10 h-10 object-cover rounded-lg border border-white/40" alt="Q" /><button onClick={() => setQuizImage(null)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 text-[8px] flex items-center justify-center">✕</button></div>}
                    </div>

                    {showQuizDocInput && (
                      <input type="text" value={quizDocLink} onChange={e => setQuizDocLink(e.target.value)} placeholder="貼上 Google Drive / PDF 網址..." className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-sm font-bold outline-none text-white placeholder:text-indigo-200" />
                    )}

                    <div className="flex gap-2 bg-white/10 p-1.5 rounded-2xl border border-white/20">
                      <input type="text" value={customQuizTopic} onChange={e => setCustomQuizTopic(e.target.value)} placeholder="輸入主題 (如: 歷史 L3)..." className="flex-1 px-4 py-2 bg-transparent text-white placeholder:text-indigo-200 outline-none font-bold text-sm" />
                      <button onClick={() => handleStartQuiz(customQuizTopic)} disabled={quizLoading} className="bg-white text-indigo-700 px-6 py-2 rounded-xl font-black hover:bg-indigo-50 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg">
                        {quizLoading ? <div className="w-4 h-4 border-2 border-indigo-700 border-t-transparent rounded-full animate-spin"></div> : '出題'}
                      </button>
                    </div>
                  </div>
                </div>
             </div>
          </div>
        )}
      </main>

      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-full px-4 py-2 flex gap-1 z-[1000] border-t-4 border-t-indigo-100">
        {[
          { id: 'notes', icon: '📓', label: '筆記' },
          { id: 'planner', icon: '📅', label: '規劃' },
          { id: 'quiz_hub', icon: '🎯', label: '測驗' },
          { id: 'ai_tutor', icon: '👨‍🏫', label: '老師' }
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)} className={`flex flex-col items-center gap-1 px-6 py-2 rounded-full transition-all duration-300 ${activeTab.includes(tab.id) ? 'bg-indigo-600 text-white shadow-lg scale-110' : 'text-slate-400 hover:text-slate-600'}`}>
            <span className="text-xl">{tab.icon}</span>
            <span className="text-[9px] font-black uppercase tracking-tighter">{tab.label}</span>
          </button>
        ))}
      </div>

      {showSettings && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-xs rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-black text-center mb-6 text-slate-800">個人設定</h2>
            <div className="space-y-4">
              <div className="flex flex-col items-center">
                 <button onClick={() => avatarInputRef.current?.click()} className="w-20 h-20 rounded-full bg-slate-50 border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center">
                   {profile.avatar ? <img src={profile.avatar} className="w-full h-full object-cover" /> : <span className="text-2xl">👤</span>}
                 </button>
                 <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
                 <p className="mt-2 text-[10px] font-bold text-slate-400">更換頭像</p>
              </div>
              <input type="text" value={profile.name} onChange={e => setProfile(p => ({...p, name: e.target.value}))} className="w-full p-4 bg-slate-50 rounded-2xl font-bold outline-none border border-slate-100 focus:ring-2 focus:ring-indigo-500" placeholder="你的姓名" />
              <button onClick={() => setShowSettings(false)} className="w-full bg-slate-800 text-white py-4 rounded-2xl font-black hover:bg-black transition-all">確定</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
