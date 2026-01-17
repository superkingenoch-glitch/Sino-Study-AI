
export interface NoteContent {
  title: string;
  summary: string;
  keyPoints: string[];
  mindMap: MindMapNode;
}

export interface MindMapNode {
  id: string;
  text: string;
  children?: MindMapNode[];
  color?: string;
}

export interface ExamScheduleItem {
  date: string;
  topic: string;
  duration: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface ExamSchedule {
  planTitle: string;
  items: ExamScheduleItem[];
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

export interface QuizSet {
  title: string;
  questions: QuizQuestion[];
  timeLimit?: number;
}

export interface QuizSettings {
  level: string;
  difficulty: '簡單' | '普通' | '困難';
  questionCount: number;
  timeLimit: number;
}
