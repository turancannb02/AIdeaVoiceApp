import { Speaker } from './analysis';

export interface Recording {
  id: string;
  uri: string;
  timestamp: number;
  duration: number;
  transcription?: string;
  categories?: string[];
  title?: string;
  status: 'recording' | 'analyzing' | 'completed' | 'failed';
} 