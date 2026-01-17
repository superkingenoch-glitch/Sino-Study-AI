
import React, { useState, useEffect, useRef } from 'react';
import { QuizSet } from '../types';
import { GoogleGenAI } from "@google/genai";

interface Props {
  quizSet: QuizSet;
  onClose: () => void;
}

const QuizView: React.FC<Props> = ({ quizSet, onClose }) => {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(quizSet.timeLimit || null);
  
  // AI 提問功能狀態
  const [aiQuery, setAiQuery] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (timeLeft === null || finished) return;
    if (timeLeft === 0) {
      setFinished(true);
      return;
    }
    const timer = setInterval(() => setTimeLeft(prev => prev! - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, finished]);

  useEffect(() => {
    if (aiResponse && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [aiResponse]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSelect = (idx: number) => {
    if (showExplanation) return;
    setSelectedOption(idx);
    setShowExplanation(true);
    if (idx === quizSet.questions[currentQuestion].correctAnswer) {
      setScore(s => s + 1);
    }
  };

  const handleNext = () => {
    if (currentQuestion < quizSet.questions.length - 1) {
      setCurrentQuestion(c => c + 1);
      setSelectedOption(null);
      setShowExplanation(false);
      setAiResponse('');
      setAiQuery('');
    } else {
      setFinished(true);
    }
  };

  const askAI = async () => {
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const q = quizSet.questions[currentQuestion];
      const prompt = `你是一位親切的家教老師。針對以下題目，學生問了：『${aiQuery}』。
      題目：${q.question}
      選項：${q.options.join(', ')}
      正確答案：${q.options[q.correctAnswer]}
      原始解析：${q.explanation}
      請用簡單易懂、鼓勵的方式回答學生，幫助他徹底理解。`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
      });
      setAiResponse(response.text || '抱歉，我暫時無法回答。');
    } catch (error) {
      console.error(error);
      setAiResponse('連線似乎有點問題，請稍後再試。');
    } finally {
      setAiLoading(false);
    }
  };

  if (finished) {
    return (
      <div className="bg-white p-8 rounded-3xl shadow-xl text-center max-w-2xl mx-auto animate-slide-in">
        <div className="text-6xl mb-4">🏆</div>
        <h3 className="text-2xl font-bold text-slate-800 mb-2">測驗完成！</h3>
        <p className="text-slate-600 mb-6">你的得分是 {score} / {quizSet.questions.length}</p>
        <button 
          onClick={onClose}
          className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all"
        >
          返回首頁
        </button>
      </div>
    );
  }

  const q = quizSet.questions[currentQuestion];

  return (
    <div className="bg-white p-8 rounded-3xl shadow-xl animate-in fade-in zoom-in duration-300 max-w-2xl mx-auto mb-20">
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-2">
          <span className="text-sm font-bold text-indigo-500 bg-indigo-50 px-3 py-1 rounded-full">
            問題 {currentQuestion + 1} / {quizSet.questions.length}
          </span>
          {timeLeft !== null && (
            <span className={`text-sm font-bold px-3 py-1 rounded-full ${timeLeft < 30 ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-500'}`}>
              ⏱️ {formatTime(timeLeft)}
            </span>
          )}
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">✕</button>
      </div>

      <h3 className="text-xl font-bold text-slate-800 mb-8">{q.question}</h3>

      <div className="space-y-3 mb-8">
        {q.options.map((option, idx) => (
          <button
            key={idx}
            onClick={() => handleSelect(idx)}
            className={`w-full p-4 rounded-2xl border-2 text-left transition-all font-medium ${
              selectedOption === idx 
                ? (idx === q.correctAnswer ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-red-500 bg-red-50 text-red-700')
                : (showExplanation && idx === q.correctAnswer ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-100 bg-slate-50 hover:border-indigo-200')
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      {showExplanation && (
        <div className="space-y-6 animate-in slide-in-from-top-2">
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <p className="text-sm font-bold text-slate-800 mb-1">💡 基礎解析</p>
            <p className="text-sm text-slate-600 leading-relaxed">{q.explanation}</p>
          </div>

          <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">🤖</span>
              <p className="text-sm font-bold text-indigo-700">對題目不解？問問 AI 老師</p>
            </div>
            
            {aiResponse && (
              <div className="mb-4 p-4 bg-white rounded-xl border border-indigo-50 text-sm text-slate-700 leading-relaxed shadow-sm">
                {aiResponse}
              </div>
            )}

            <div className="flex gap-2">
              <input 
                type="text" 
                value={aiQuery}
                onChange={(e) => setAiQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && askAI()}
                placeholder="例如：為什麼不能選 B？"
                className="flex-1 p-3 bg-white border border-indigo-100 rounded-xl outline-none text-sm focus:ring-2 focus:ring-indigo-500"
              />
              <button 
                onClick={askAI}
                disabled={aiLoading || !aiQuery.trim()}
                className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center min-w-[80px]"
              >
                {aiLoading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : '提問'}
              </button>
            </div>
            <div ref={chatEndRef} />
          </div>

          <button 
            onClick={handleNext}
            className="w-full bg-slate-800 text-white py-4 rounded-2xl font-bold hover:bg-black shadow-lg transition-all active:scale-[0.98]"
          >
            {currentQuestion < quizSet.questions.length - 1 ? '下一題' : '查看結果'}
          </button>
        </div>
      )}
    </div>
  );
};

export default QuizView;
