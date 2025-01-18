export interface AnalysisResponse {
  summary: string;
  keyPoints: string[];
  topics: string[];
  isMeeting: boolean;
  speakers: Speaker[];
  rawTranscription: string;
}

export interface Speaker {
  name: string;
  lines: {
    text: string;
    timestamp: number;
  }[];
} 