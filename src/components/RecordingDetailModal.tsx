import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Platform, ActionSheetIOS, Alert, Image, SafeAreaView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Recording } from '../types/recording';
import { useRecordingStore } from '../stores/useRecordingStore';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import * as Print from 'expo-print';
import { shareAsync } from 'expo-sharing';
import { processMeetingChat } from '../utils/textProcessor';
import { getAvatarUri } from '../utils/avatarLoader';
import { ChatBubble } from './ChatBubble';
import { translateText } from '../services/translationService';
import { useUserStore } from '../stores/useUserStore';
import { useAudioRecorder } from '../hooks/useAudioRecorder';

interface ChatMessage {
  speaker: string;
  message: string;
  timestamp: string;
  avatarIndex: number;
}

interface ChatViewProps {
  messages: ChatMessage[];
  onClose: () => void;
  type?: 'ai' | 'meeting';
}

interface Language {
  code: string;
  name: string;
  flag: string;
}

const LANGUAGES: Language[] = [
  { code: 'tr', name: 'Turkish', flag: '🇹🇷' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹' },
  { code: 'ru', name: 'Russian', flag: '🇷🇺' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ja', name: 'Japanese', flag: '🇯🇵' },
  { code: 'ko', name: 'Korean', flag: '🇰🇷' },
];

const PRESET_CATEGORIES = [
  { id: 'meeting', color: '#4CAF50', icon: 'people' as const },
  { id: 'note', color: '#2196F3', icon: 'document-text' as const },
  { id: 'reminder', color: '#FF9800', icon: 'alarm' as const },
  { id: 'task', color: '#9C27B0', icon: 'checkbox' as const },
  { id: 'idea', color: '#F44336', icon: 'bulb' as const },
  { id: 'personal', color: '#E91E63', icon: 'person' as const },
  { id: 'work', color: '#795548', icon: 'briefcase' as const },
  { id: 'study', color: '#009688', icon: 'school' as const },
];

interface Props {
  recording: Recording;
  visible: boolean;
  onClose: () => void;
}

type ChatType = 'ai' | 'meeting' | null;

const mockMessages: ChatMessage[] = [
  {
    speaker: 'AI Assistant',
    message: "I've analyzed your recording. The main topics discussed were project timelines and resource allocation. Would you like me to break down the key points?",
    timestamp: '10:30 AM',
    avatarIndex: 0
  },
  {
    speaker: 'You',
    message: "Yes, please highlight the main action items.",
    timestamp: '10:31 AM',
    avatarIndex: 1
  },
  {
    speaker: 'AI Assistant',
    message: "Here are the key action items:\n\n1. Team meeting scheduled for next Tuesday\n2. Budget review deadline on Friday\n3. Marketing team to update presentation\n4. Engineering team to revise timeline",
    timestamp: '10:31 AM',
    avatarIndex: 0
  },
  {
    speaker: 'You',
    message: "Can you create calendar events for these?",
    timestamp: '10:32 AM',
    avatarIndex: 1
  },
  {
    speaker: 'AI Assistant',
    message: "I've prepared calendar invites for:\n\n• Team meeting (Tuesday 10 AM)\n• Budget review (Friday 2 PM)\n• Marketing presentation deadline\n• Timeline revision session\n\nWould you like me to send these now?",
    timestamp: '10:32 AM',
    avatarIndex: 0
  },
  {
    speaker: 'You',
    message: "Yes, please send them.",
    timestamp: '10:33 AM',
    avatarIndex: 1
  },
  {
    speaker: 'AI Assistant',
    message: "Calendar invites have been sent! Is there anything else you'd like me to help you with?",
    timestamp: '10:33 AM',
    avatarIndex: 0
  }
];

const mockMeetingMessages: ChatMessage[] = [
  {
    speaker: 'Sarah',
    message: "Good morning everyone! Let's discuss the project timeline.",
    timestamp: '10:00 AM',
    avatarIndex: 2
  },
  {
    speaker: 'Mike',
    message: "I've reviewed the budget numbers. We might need to adjust some allocations.",
    timestamp: '10:01 AM',
    avatarIndex: 3
  },
  {
    speaker: 'You',
    message: "Can we go through the main milestones?",
    timestamp: '10:02 AM',
    avatarIndex: 1
  },
  {
    speaker: 'Sarah',
    message: "Sure! The first milestone is the client presentation next week.",
    timestamp: '10:03 AM',
    avatarIndex: 2
  },
  {
    speaker: 'Mike',
    message: "We should also discuss the resource allocation for Q3.",
    timestamp: '10:04 AM',
    avatarIndex: 3
  },
  {
    speaker: 'You',
    message: "Agreed. Let's schedule a follow-up meeting for that.",
    timestamp: '10:05 AM',
    avatarIndex: 1
  }
];

const TranslateButton = ({ onPress }: { onPress: () => void }) => (
  <TouchableOpacity 
    onPress={onPress}
    style={styles.translateButton}
  >
    <View style={styles.translateButtonContent}>
      <Ionicons name="language" size={20} color="#4A90E2" />
      <Text style={styles.translateButtonText}>Translate</Text>
    </View>
  </TouchableOpacity>
);

export const RecordingDetailModal: React.FC<Props> = ({ recording, visible, onClose }) => {
  const updateRecordingCategory = useRecordingStore(state => state.updateRecordingCategory);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    recording?.categories?.[0] || 'General'
  );
  const [showTranslation, setShowTranslation] = useState(false);
  const [translatedText, setTranslatedText] = useState('');
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showChatView, setShowChatView] = useState(false);
  const [showChat, setShowChat] = useState<ChatType>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>(mockMessages);
  const [selectedLanguage, setSelectedLanguage] = useState<Language | null>(null);
  const { recordingDuration } = useAudioRecorder();

  if (!recording) return null;

  const generateSummary = (transcription: string): string => {
    const sentences = transcription.split('. ');
    return sentences.length > 2 ? sentences.slice(0, 2).join('. ') + '...' : transcription;
  };

  const handleCategoryChange = (category: string) => {
    if (!recording) return;
    setSelectedCategory(category);
    updateRecordingCategory(recording.id, category);
  };

  const handleTranslate = () => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...LANGUAGES.map(lang => `${lang.flag} ${lang.name}`), 'Cancel'],
          cancelButtonIndex: LANGUAGES.length,
        },
        async (buttonIndex) => {
          if (buttonIndex < LANGUAGES.length) {
            const language = LANGUAGES[buttonIndex];
            setSelectedLanguage(language);
            try {
              const translated = await translateText(recording.transcription || '', language.code);
              setTranslatedText(translated);
              setShowTranslation(true);
            } catch (error) {
              Alert.alert('Translation Error', 'Failed to translate text');
            }
          }
        }
      );
    } else {
      Alert.alert(
        'Select Language',
        'Choose a language to translate to:',
        [
          ...LANGUAGES.map(lang => ({
            text: `${lang.flag} ${lang.name}`,
            onPress: async () => {
              setSelectedLanguage(lang);
              try {
                const translated = await translateText(recording.transcription || '', lang.code);
                setTranslatedText(translated);
                setShowTranslation(true);
              } catch (error) {
                Alert.alert('Translation Error', 'Failed to translate text');
              }
            },
          })),
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };

  const generatePDF = async () => {
    const formattedDate = new Date().toLocaleDateString();
    const htmlContent = `
      <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
          <h1 style="color: #333;">${recording?.title || 'Voice Recording'}</h1>
          <p style="color: #666; font-size: 14px;">Generated on: ${formattedDate}</p>
          <div style="margin: 20px 0;">
            <h2 style="color: #333;">Transcription</h2>
            <p style="line-height: 1.6;">${recording?.transcription || 'No transcription available.'}</p>
          </div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });
      
      if (Platform.OS === 'ios') {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      } else {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf' });
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF');
    }
  };

  const handleShareType = async (type: 'pdf' | 'email' | 'transcript' | 'audio') => {
    if (!recording) return;
    setShowShareMenu(false);
    
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const userStore = useUserStore();
      const analytics = userStore.getAnalytics();

      // Update analytics based on share type
      userStore.updateAnalytics({
        totalRecordingMinutes: analytics.totalRecordingMinutes + (recordingDuration / 60),
        totalExports: type === 'pdf' ? analytics.totalExports + 1 : analytics.totalExports,
        totalShares: type !== 'pdf' ? analytics.totalShares + 1 : analytics.totalShares,
      });

      switch (type) {
        case 'pdf':
          await generatePDF();
          break;
        case 'email':
          const emailContent = `
${recording.title}
${recording.transcription}

AI Analysis:
${generateSummary(recording.transcription || '')}`;
          await Share.share({
            message: emailContent,
            title: recording.title,
          });
          break;
        case 'transcript':
          await Share.share({
            message: recording.transcription || '',
            title: 'Transcript',
          });
          break;
        case 'audio':
          if (Platform.OS === 'ios') {
            await Share.share({ url: recording.uri });
          } else {
            await Sharing.shareAsync(recording.uri);
          }
          break;
      }
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleShare = () => {
    if (!recording) return;
    
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title: 'Share & export notes with a tap',
          options: ['Cancel', 'Export to PDF', 'Email Notes', 'Share Transcript', 'Share Audio File'],
          cancelButtonIndex: 0,
        },
        async (buttonIndex) => {
          try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            switch (buttonIndex) {
              case 1: // PDF
                handleShareType('pdf');
                break;
              case 2: // Email
                handleShareType('email');
                break;
              case 3: // Transcript
                handleShareType('transcript');
                break;
              case 4: // Audio
                handleShareType('audio');
                break;
            }
          } catch (error) {
            console.error('Error sharing:', error);
          }
        }
      );
    } else {
      setShowShareMenu(true);
    }
  };

  const ShareSheet = () => (
    <Modal
      visible={showShareMenu}
      transparent
      animationType="slide"
      onRequestClose={() => setShowShareMenu(false)}
    >
      <TouchableOpacity 
        style={styles.shareOverlay}
        activeOpacity={1}
        onPress={() => setShowShareMenu(false)}
      >
        <View style={styles.shareSheet}>
          <View style={styles.shareSheetHandle} />
          <Text style={styles.shareSheetTitle}>Share & export notes with a tap</Text>
          <TouchableOpacity 
            style={styles.shareOption}
            onPress={() => handleShareType('pdf')}
          >
            <Text style={styles.shareOptionText}>Export to PDF</Text>
            <Ionicons name="document-outline" size={22} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.shareOption}
            onPress={() => handleShareType('email')}
          >
            <Text style={styles.shareOptionText}>Email Notes</Text>
            <Ionicons name="mail-outline" size={22} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.shareOption}
            onPress={() => handleShareType('transcript')}
          >
            <Text style={styles.shareOptionText}>Share Transcript</Text>
            <Ionicons name="chatbubble-outline" size={22} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.shareOption}
            onPress={() => handleShareType('audio')}
          >
            <Text style={styles.shareOptionText}>Share Audio File</Text>
            <Ionicons name="musical-notes-outline" size={22} color="#666" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const ChatView: React.FC<ChatViewProps> = ({ messages, onClose, type = 'ai' }) => {
    const isAIChat = type === 'ai';
    const aiAssistantAvatarIndex = 0;
    const getRandomUserAvatarIndex = () => Math.floor(Math.random() * 8);

    const getMessageAvatarIndex = (message: ChatMessage) => {
      if (message.speaker === 'AI Assistant') {
        return aiAssistantAvatarIndex;
      }
      return message.avatarIndex || getRandomUserAvatarIndex();
    };

    return (
      <Modal
        animationType="slide"
        presentationStyle="pageSheet"
        visible={true}
        onRequestClose={onClose}
        statusBarTranslucent
      >
        <View style={styles.chatContainer}>
          <LinearGradient
            colors={isAIChat ? ['#6B9FFF', '#4B7BFF'] : ['#FF6B9F', '#FF4B7B']}
            style={styles.chatHeaderGradient}
          >
            <View style={styles.chatHeader}>
              <TouchableOpacity 
                onPress={onClose} 
                style={styles.closeButton}
              >
                <Ionicons name="chevron-down" size={24} color="#fff" />
              </TouchableOpacity>
              <View style={styles.chatTitleContainer}>
                {isAIChat ? (
                  <>
                    <View style={styles.aiTitleContainer}>
                      <Image 
                        source={getAvatarUri(aiAssistantAvatarIndex)}
                        style={styles.aiAvatar}
                      />
                      <Text style={styles.chatTitle}>Meeting Replay</Text>
                    </View>
                    <Text style={styles.chatSubtitle}>Interactive Analysis</Text>
                  </>
                ) : (
                  <>
                    <View style={styles.aiTitleContainer}>
                      <Ionicons name="people" size={24} color="#fff" style={styles.groupIcon} />
                      <Text style={styles.chatTitle}>Meeting Chat</Text>
                    </View>
                    <Text style={styles.chatSubtitle}>Conversation Replay</Text>
                  </>
                )}
              </View>
            </View>
          </LinearGradient>
          
          <ScrollView 
            style={styles.chatContent}
            contentContainerStyle={styles.chatContentContainer}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((msg, index) => (
              <ChatBubble
                key={index}
                message={msg.message}
                timestamp={msg.timestamp}
                speaker={msg.speaker}
                isUser={msg.speaker === 'You'}
                avatarIndex={getMessageAvatarIndex(msg)}
              />
            ))}
          </ScrollView>
        </View>
      </Modal>
    );
  };

  const handleShowAIChat = () => {
    setChatMessages(mockMessages);
    setShowChat('ai');
  };

  const handleShowMeetingChat = () => {
    setChatMessages(mockMeetingMessages);
    setShowChat('meeting');
  };

  const handleCloseChat = () => {
    setShowChat(null);
  };

  const renderTranslation = () => {
    if (!showTranslation || !selectedLanguage) return null;
    
    return (
      <View style={styles.translationWrapper}>
        <View style={styles.translationHeader}>
          <View style={styles.translationTitleContainer}>
            <Text style={styles.translationFlag}>{selectedLanguage.flag}</Text>
            <Text style={styles.translationTitle}>{selectedLanguage.name}</Text>
          </View>
          <TouchableOpacity 
            onPress={() => setShowTranslation(false)}
            style={styles.closeTranslationButton}
          >
            <Ionicons name="close-circle" size={24} color="#666" />
          </TouchableOpacity>
        </View>
        <ScrollView style={styles.translatedTextContainer}>
          <Text style={styles.translatedText}>{translatedText}</Text>
        </ScrollView>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.title}>{recording?.title || 'Recording Details'}</Text>
          <TouchableOpacity 
            style={styles.shareButton}
            onPress={handleShare}
          >
            <Ionicons name="share-outline" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Hero Section */}
          <View style={styles.heroSection}>
            <LinearGradient
              colors={['#6B9FFF', '#4B7BFF']}
              style={styles.heroBackground}
            >
              <View style={styles.heroContent}>
                <View style={styles.welcomeIcon}>
                  <Ionicons name="mic" size={24} color="#fff" />
                </View>
                <Text style={styles.heroTitle}>Voice Recording</Text>
                <Text style={styles.heroSubtitle}>
                  {generateSummary(recording?.transcription || '')}
                </Text>
              </View>
            </LinearGradient>
          </View>

          {/* Categories Section */}
          <Text style={styles.sectionTitle}>Categories 🏷️</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesScroll}
          >
            {PRESET_CATEGORIES.map((category) => (
              <TouchableOpacity
                key={category.id}
                style={[
                  styles.categoryButton,
                  selectedCategory === category.id && { backgroundColor: category.color }
                ]}
                onPress={() => handleCategoryChange(category.id)}
              >
                <Ionicons 
                  name={category.icon} 
                  size={20} 
                  color={selectedCategory === category.id ? '#fff' : category.color} 
                />
                <Text style={[
                  styles.categoryButtonText,
                  selectedCategory === category.id && { color: '#fff' }
                ]}>
                  {category.id.charAt(0).toUpperCase() + category.id.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Raw Transcription Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Raw Transcription 📝</Text>
            <View style={styles.transcriptionCard}>
              <TranslateButton onPress={handleTranslate} />
              <Text style={styles.transcriptionText}>
                {recording?.transcription || 'No transcription available.'}
              </Text>
              {renderTranslation()}
            </View>
          </View>

          {/* AI Enhanced Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>AIdeaVoice Analysis ✨</Text>
            
            {/* Summary */}
            <View style={styles.aiCard}>
              <Text style={styles.aiCardTitle}>Summary 📋</Text>
              <Text style={styles.aiCardText}>
                {generateSummary(recording?.transcription || '')}
              </Text>
            </View>

            {/* Key Points */}
            <View style={styles.aiCard}>
              <Text style={styles.aiCardTitle}>Key Points 🎯</Text>
              <Text style={styles.aiCardText}>
                {recording?.transcription?.split('. ').slice(0, 3).map((point, index) => (
                  `• ${point}${index < 2 ? '\n' : ''}`
                )).join('')}
              </Text>
            </View>

            {/* AI Analysis */}
            <View style={styles.aiCard}>
              <Text style={styles.aiCardTitle}>Interactive Analysis ✨</Text>
              
              <View style={styles.buttonsContainer}>
                <TouchableOpacity 
                  style={[styles.actionButton, styles.chatButton]}
                  onPress={handleShowAIChat}
                >
                  <View style={styles.actionIconContainer}>
                    <Ionicons name="chatbubbles-outline" size={20} color="#4B7BFF" />
                  </View>
                  <Text style={styles.actionButtonText}>AI Analysis Chat</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.actionButton, styles.chatButton]}
                  onPress={handleShowMeetingChat}
                >
                  <View style={styles.actionIconContainer}>
                    <Ionicons name="people-outline" size={20} color="#FF4B7B" />
                  </View>
                  <Text style={styles.actionButtonText}>Meeting Replay</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      <ShareSheet />

      {showChat && (
        <ChatView 
          messages={chatMessages}
          onClose={handleCloseChat}
        />
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#ffffff',
  },
  closeButton: {
    padding: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginLeft: 16,
    color: '#333',
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
    paddingVertical: 20,
  },
  metadata: {
    marginBottom: 24,
  },
  date: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  categoryTag: {
    backgroundColor: '#E1F5FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0288D1',
    textAlign: 'center',
  },
  categoryIcon: {
    color: '#0288D1',
  },
  transcription: {
    gap: 16,
  },
  transcriptionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  heroSection: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  heroBackground: {
    borderRadius: 16,
  },
  heroContent: {
    padding: 16,
    alignItems: 'center',
  },
  welcomeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    marginLeft: 20,
  },
  transcriptionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
  },
  transcriptionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  keyPointsContainer: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  keyPointItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  keyPointIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  keyPointContent: {
    flex: 1,
  },
  keyPointLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  keyPointValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 24,
  },
  categoryCard: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#E3F2FD',
  },
  categoriesScroll: {
    marginHorizontal: 20,
    marginBottom: 24,
  },
  categoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryButtonText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 16,
  },
  aiCard: {
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  aiCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  aiCardText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
    marginBottom: 16,
  },
  keyPointsList: {
    gap: 12,
  },
  participantTag: {
    fontSize: 13,
    color: '#666',
    fontStyle: 'italic',
  },
  bulletPoint: {
    fontSize: 18,
    color: '#666',
    marginRight: 8,
    marginTop: -2,
  },
  keyPointText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
  },
  transcriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
    paddingBottom: 16,
    paddingRight: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  transcriptionActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#90CAF9',
  },
  actionIconContainer: {
    marginRight: 8,
  },
  actionIcon: {
    fontSize: 18,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1976D2',
  },
  translateButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    marginBottom: 16,
  },
  translateButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  translateButtonText: {
    marginLeft: 8,
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '600',
  },
  shareIconContainer: {
    width: 30,
    alignItems: 'flex-end',
    marginLeft: 'auto',
  },
  selectedLanguage: {
    fontSize: 16,
    marginLeft: 8,
  },
  translatedText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  shareButton: {
    padding: 8,
  },
  shareMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  shareMenuContainer: {
    width: '80%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  shareMenu: {
    padding: 16,
  },
  shareMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  shareMenuText: {
    marginLeft: 16,
    fontSize: 16,
    color: '#333',
  },
  shareOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  shareSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  shareSheetHandle: {
    width: 36,
    height: 5,
    backgroundColor: '#ddd',
    borderRadius: 3,
    marginVertical: 12,
    alignSelf: 'center',
  },
  shareSheetTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  shareOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: 'white',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
  },
  shareOptionText: {
    fontSize: 17,
    color: '#000',
  },
  chatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    backgroundColor: '#EBF1FF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1E2FF',
  },
  chatButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4B7BFF',
    marginLeft: 8,
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  chatHeaderGradient: {
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingBottom: 16,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chatContent: {
    flex: 1,
  },
  chatContentContainer: {
    paddingVertical: 8,
  },
  chatTitleContainer: {
    flex: 1,
    alignItems: 'center',
    marginRight: 40,
    justifyContent: 'center',
  },
  aiTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    width: '100%',
    justifyContent: 'center',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 8,
    backgroundColor: '#fff',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  groupIcon: {
    marginRight: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#fff',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  chatTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textShadowColor: 'rgba(0,0,0,0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    textAlign: 'center',
  },
  chatSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 2,
    letterSpacing: 0.3,
  },
  messageContainer: {
    width: '100%',
    paddingHorizontal: 16,
    marginVertical: 4,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  otherMessageContainer: {
    alignItems: 'flex-start',
  },
  buttonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  analysisButton: {
    flex: 1,
    minWidth: 150,
    maxWidth: '45%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  translationWrapper: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  translationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  translationTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  translationFlag: {
    fontSize: 24,
    marginRight: 8,
  },
  translationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeTranslationButton: {
    padding: 4,
  },
  translatedTextContainer: {
    maxHeight: 300,
    padding: 16,
  },
});