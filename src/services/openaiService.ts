import { ENV } from '../config/env';
import * as FileSystem from 'expo-file-system';

interface TranscriptionResponse {
  text: string;
  language?: string;
  error?: string;
}

interface AnalysisResponse {
  summary: string;
  keyPoints: string[];
  topics: string[];
  speakers?: {
    name: string;
    lines: {
      text: string;
      timestamp: number;
    }[];
  }[];
  rawTranscription: string;
}

const verifyApiKey = () => {
  console.log('API Key:', ENV.OPENAI_API_KEY ? 'Present' : 'Missing');
  if (!ENV.OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured');
  }
};

export const transcribeAudio = async (uri: string): Promise<TranscriptionResponse> => {
  try {
    verifyApiKey();
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) {
      throw new Error('Audio file not found');
    }

    const formData = new FormData();
    formData.append('file', {
      uri: uri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as any);
    formData.append('model', 'whisper-1');
    formData.append('response_format', 'json');
    formData.append('language', 'en');

    const response = await fetch(`${ENV.API_URL}/transcriptions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ENV.OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'Transcription failed');
    }

    const data = await response.json();
    return {
      text: data.text,
      language: data.language
    };

  } catch (error) {
    console.error('Transcription error:', error);
    return {
      text: '',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
};

export const analyzeTranscription = async (text: string): Promise<AnalysisResponse> => {
  try {
    verifyApiKey();
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ENV.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `Analyze this transcription and identify speakers if it's a meeting. 
                     Format the response as JSON:
                     {
                       "summary": "Brief summary",
                       "keyPoints": ["Key point 1", "Key point 2"],
                       "topics": ["Topic 1", "Topic 2"],
                       "isMeeting": boolean,
                       "speakers": [
                         {
                           "name": "Speaker Name/Role",
                           "lines": [
                             {
                               "text": "What was said",
                               "timestamp": estimated_time_in_seconds
                             }
                           ]
                         }
                       ],
                       "rawTranscription": "Original text"
                     }`
          },
          {
            role: 'user',
            content: `Analyze this transcription: ${text}`
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error('Analysis failed');
    }

    const data = await response.json();
    return JSON.parse(data.choices[0].message.content);
  } catch (error) {
    console.error('Analysis error:', error);
    throw error;
  }
}; 