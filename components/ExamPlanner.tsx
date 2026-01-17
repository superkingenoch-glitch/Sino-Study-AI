
import React, { useState } from 'react';
import { generateExamSchedule } from '../services/geminiService';
import { ExamSchedule } from '../types';

const ExamPlanner: React.FC = () => {
  const [goal, setGoal] = useState('');
  const [loading, setLoading] = useState(false);
  const [schedule, setSchedule] = useState<ExamSchedule | null>(null);

  const handleGenerate = async () => {
    if (!goal) return;
    setLoading(true);
    try {
      const result = await generateExamSchedule(goal);
      setSchedule(result);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <h3 className="text-xl font-bold text-slate-800 mb-4">🗓️ 考前規劃助攻</h3>
        <p className="text-sm text-slate-500 mb-4">輸入你的考試日期、科目或目前的學習進度，AI 將為你打造專屬複習表。</p>
        <div className="flex gap-2">
          <input
            type="text"
            className="flex-1 p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            placeholder="例如：兩週後考多益，目前只念完前三章..."
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
          />
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all font-medium"
          >
            {loading ? '生成中...' : '開始規劃'}
          </button>
        </div>
      </div>

      {schedule && (
        <div className="bg-white p-6 rounded-2xl shadow-md border border-indigo-100 animate-fadeIn">
          <h4 className="text-lg font-bold text-indigo-900 mb-4">{schedule.planTitle}</h4>
          <div className="space-y-4">
            {schedule.items.map((item, idx) => (
              <div key={idx} className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 hover:bg-indigo-50 transition-colors border border-slate-100">
                <div className="w-24 text-sm font-semibold text-indigo-600">{item.date}</div>
                <div className="flex-1">
                  <div className="font-medium text-slate-800">{item.topic}</div>
                  <div className="text-xs text-slate-500">預計時間：{item.duration}</div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                  item.priority === 'High' ? 'bg-red-100 text-red-600' : 
                  item.priority === 'Medium' ? 'bg-yellow-100 text-yellow-600' : 
                  'bg-green-100 text-green-600'
                }`}>
                  {item.priority}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExamPlanner;
