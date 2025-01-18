import 'dotenv/config';

export default {
  name: 'AIdeaVoice',
  version: '1.0.0',
  extra: {
    API_URL: process.env.API_URL,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  }
}; 