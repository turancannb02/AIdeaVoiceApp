import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Text, TouchableOpacity, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { useAudioRecorder } from './hooks/useAudioRecorder';
import { AudioVisualizer } from './components/AudioVisualizer';
import { RecordingListItem } from './components/RecordingListItem';
import { RecordingFilters } from './components/RecordingFilters';
import { RecordingDetailModal } from './components/RecordingDetailModal';
import { SplashScreen } from './components/SplashScreen';
import { Ionicons } from '@expo/vector-icons';
import { Recording } from './types/recording';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { RecordingModal } from './components/RecordingModal';
import { useRecordingStore } from './stores/useRecordingStore';
import { ErrorBoundary } from './components/ErrorBoundary';
import { RecordingsList } from './components/RecordingsList';
import { FloatingActionButton } from './components/FloatingActionButton';

function AppContent() {
  const insets = useSafeAreaInsets();
  const [showSplash, setShowSplash] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { 
    recordings, 
    selectedFilter, 
    setSelectedFilter,
    selectedRecording, 
    setSelectedRecording,
    refreshRecordings,
    loadRecordings 
  } = useRecordingStore();

  useEffect(() => {
    loadRecordings();
  }, []);

  const { 
    startRecording, 
    stopRecording, 
    recordingState, 
    audioLevel, 
    recordingDuration 
  } = useAudioRecorder();

  const formatDuration = useCallback((duration: number) => {
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, []);

  const uniqueCategories = useMemo(() => {
    const categories = recordings.flatMap(r => r.categories || []);
    return [...new Set(categories)];
  }, [recordings]);

  const onRefresh = React.useCallback(async () => {
    try {
      setRefreshing(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await refreshRecordings();
      await new Promise(resolve => setTimeout(resolve, 800));
    } catch (error) {
      console.error('Error refreshing:', error);
    } finally {
      setRefreshing(false);
    }
  }, [refreshRecordings]);

  if (showSplash) {
    return <SplashScreen onFinish={() => setShowSplash(false)} />;
  }

  return (
    <ErrorBoundary>
      <ScrollView
        style={[styles.safeArea, { paddingTop: insets.top }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F44336"
            colors={['#F44336', '#2196F3', '#4CAF50']}
            progressBackgroundColor="#ffffff"
            title={`AIdeaVoice v${Constants.expoConfig?.version || '1.0.0'}`}
            titleColor="#666"
          />
        }
      >
        <SafeAreaView style={styles.container}>
          <StatusBar style="auto" />
          <View style={styles.header}>
            <Text style={styles.greeting}>Welcome to AIdeaVoice ✨</Text>
            <Text style={styles.subtitle}>Transform your voice into organized thoughts 💭</Text>
          </View>
          
          <RecordingFilters
            selectedFilter={selectedFilter}
            onFilterChange={setSelectedFilter}
            categories={uniqueCategories}
          />
          
          <View style={styles.recordingsHeader}>
            <Text style={styles.sectionTitle}>Your Voice Notes 🗣️</Text>
          </View>
          
          <RecordingsList />
          
          
          <View style={styles.startButtonContainer}>
            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: '#F44336' }]}
              onPress={startRecording}
              disabled={recordingState !== 'idle'}
            >
              <Text style={styles.buttonText}>Start AIdeaVoice 🎙</Text>
            </TouchableOpacity>
          </View>
          
          <RecordingModal
            visible={recordingState !== 'idle'}
            onClose={stopRecording}
            audioLevel={audioLevel}
            recordingDuration={recordingDuration}
            recordingState={recordingState}
            formatDuration={formatDuration}
          />

          {selectedRecording && (
            <RecordingDetailModal
              recording={selectedRecording}
              visible={!!selectedRecording}
              onClose={() => setSelectedRecording(null)}
            />
          )}
        </SafeAreaView>
        <FloatingActionButton />
      </ScrollView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  darkBackground: {
    backgroundColor: '#121212',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  darkText: {
    color: '#FFFFFF',
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    lineHeight: 24,
  },
  startButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  recordingsHeader: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  startButtonContainer: {
    position: 'absolute',
    bottom: -150,
    left: 36,
    right: 36,
    zIndex: 1000,
  },
});

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppContent />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
