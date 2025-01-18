import { Recording } from '../types/recording';

export const generatePDF = async (recording: Recording) => {
  const formatTimestamp = (timestamp: number) => {
    const minutes = Math.floor(timestamp / 60);
    const seconds = Math.floor(timestamp % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const speakerContent = recording.speakers?.map(speaker => ({
    text: [
      { text: `${speaker.name}\n`, style: 'speakerName' },
      ...speaker.lines.map(line => ({
        text: `[${formatTimestamp(line.timestamp)}] ${line.text}\n`,
        style: 'speakerLine'
      }))
    ]
  })) || [];

  const content = {
    content: [
      {
        text: 'AIdeaVoice',
        style: 'appName'
      },
      {
        text: 'Intelligent Voice Recording Analysis',
        style: 'appTagline'
      },
      {
        canvas: [{ type: 'line', x1: 0, y1: 5, x2: 515, y2: 5, lineWidth: 1, color: '#E0E0E0' }]
      },
      {
        text: recording.title,
        style: 'documentTitle'
      },
      {
        text: `Generated on ${new Date().toLocaleDateString()}`,
        style: 'date'
      },
      {
        text: 'Transcription',
        style: 'sectionHeader'
      },
      ...(recording.speakers?.length ? speakerContent : [{
        text: recording.transcription || 'No transcription available.',
        style: 'text'
      }]),
      {
        text: 'AI Analysis',
        style: 'sectionHeader',
        pageBreak: 'before'
      },
      {
        text: 'Summary',
        style: 'subHeader'
      },
      {
        text: recording.summary || 'No summary available.',
        style: 'text'
      },
      {
        text: 'Key Points',
        style: 'subHeader'
      },
      {
        ul: recording.keyPoints?.map(point => ({
          text: point,
          style: 'listItem'
        })) || ['No key points available.']
      },
      {
        text: 'Categories',
        style: 'subHeader'
      },
      {
        ul: recording.categories?.map(category => ({
          text: category,
          style: 'listItem'
        })) || ['Uncategorized']
      }
    ],
    styles: {
      appName: {
        fontSize: 28,
        bold: true,
        color: '#4A90E2',
        alignment: 'center'
      },
      appTagline: {
        fontSize: 14,
        color: '#666',
        alignment: 'center',
        margin: [0, 0, 0, 20]
      },
      documentTitle: {
        fontSize: 24,
        bold: true,
        margin: [0, 20, 0, 10]
      },
      date: {
        fontSize: 12,
        color: '#666',
        margin: [0, 0, 0, 30]
      },
      sectionHeader: {
        fontSize: 20,
        bold: true,
        color: '#4A90E2',
        margin: [0, 20, 0, 15]
      },
      subHeader: {
        fontSize: 16,
        bold: true,
        margin: [0, 15, 0, 10]
      },
      text: {
        fontSize: 14,
        lineHeight: 1.4,
        margin: [0, 0, 0, 15]
      },
      speakerName: {
        fontSize: 14,
        bold: true,
        color: '#4A90E2',
        margin: [0, 10, 0, 5]
      },
      speakerLine: {
        fontSize: 14,
        lineHeight: 1.4,
        margin: [0, 0, 0, 5]
      },
      listItem: {
        fontSize: 14,
        lineHeight: 1.4,
        margin: [0, 0, 0, 5]
      }
    },
    defaultStyle: {
      font: 'Helvetica'
    }
  };

  return content;
}; 