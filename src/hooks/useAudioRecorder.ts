import { useState, useEffect, useCallback, useRef } from 'react';
import { Audio } from 'expo-av';
import { Recording as RecordingType } from '../types/recording';
import { transcribeAudio, categorizeText, generateTitle } from '../services/transcriptionService';
import * as FileSystem from 'expo-file-system';
import * as Haptics from 'expo-haptics';
import { useRecordingStore } from '../stores/useRecordingStore'; // Fixed import path
import { Alert } from 'react-native';

interface RecordingStore {
  addRecording: (recording: RecordingType) => void;
  deleteRecording: (id: string) => void;
}

export const useAudioRecorder = () => {
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [currentRecording, setCurrentRecording] = useState<RecordingType | null>(null);
  const [transcription, setTranscription] = useState<string>('');
  const [audioLevel, setAudioLevel] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const durationTimer = useRef<NodeJS.Timer | null>(null);
  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'analyzing'>('idle');
  const [transitionState, setTransitionState] = useState<'entering' | 'exiting' | 'none'>('none');
  const MIN_RECORDING_DURATION = 3000; // 3 seconds in milliseconds
  
  const addRecording = useRecordingStore((state: RecordingStore) => state.addRecording);
  const deleteRecording = useRecordingStore((state: RecordingStore) => state.deleteRecording);

  useEffect(() => {
    return () => {
      if (durationTimer.current) {
        clearInterval(durationTimer.current as unknown as number);
      }
    };
  }, []);

  const setupAudio = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        throw new Error('Permission not granted');
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      console.error('Error setting up audio:', error);
    }
  };

  const startRecording = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTransitionState('entering');
      await new Promise(resolve => setTimeout(resolve, 300)); // Smooth entry

      if (recording) {
        await recording.stopAndUnloadAsync();
        setRecording(null);
      }
      
      await setupAudio();
      setTranscription('');
      setRecordingDuration(0);
      setRecordingState('recording');
      
      const recordingOptions: Audio.RecordingOptions = {
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 192000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.MAX,
          sampleRate: 44100,
          numberOfChannels: 2,
          bitRate: 192000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 192000,
        }
      };

      const { recording: newRecording } = await Audio.Recording.createAsync(
        recordingOptions,
        (status) => {
          if (status.isRecording && status.metering !== undefined) {
            const level = Math.min(Math.max(status.metering || -160, -160), 0) + 160;
            setAudioLevel(level / 160);
          }
        },
        100
      );

      setRecording(newRecording);
      setCurrentRecording({
        id: Date.now().toString(),
        uri: '',
        timestamp: Date.now(),
        duration: 0,
        status: 'recording',
      });

      durationTimer.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1000);
      }, 1000);

      setTransitionState('none');
    } catch (error) {
      console.error('Failed to start recording:', error);
      setRecordingState('idle');
      setTransitionState('none');
    }
  };

  const stopRecording = useCallback(async () => {
    if (!recording || !currentRecording) return;

    try {
      // Check if recording duration is less than minimum
      if (recordingDuration < MIN_RECORDING_DURATION) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        console.log('Recording too short:', recordingDuration);
        Alert.alert(
          'Recording Too Short',
          'Please record for at least 3 seconds to process your voice note.',
          [{ text: 'OK' }]
        );
        
        // Clean up the short recording
        if (durationTimer.current) {
          clearInterval(durationTimer.current as unknown as number);
        }
        await recording.stopAndUnloadAsync();
        setRecordingState('idle');
        setRecording(null);
        setCurrentRecording(null);
        setRecordingDuration(0);
        return;
      }

      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTransitionState('exiting');
      setRecordingState('analyzing');
      
      // Add delay before stopping
      await new Promise(resolve => setTimeout(resolve, 300));

      if (durationTimer.current) {
        clearInterval(durationTimer.current as unknown as number);
      }

      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      
      if (!uri) throw new Error('Recording URI is undefined');

      const finalRecording: RecordingType = {
        ...currentRecording,
        uri,
        duration: recordingDuration,
        status: 'analyzing',
      };

      // Artificial delay for smooth transition
      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        const text = await transcribeAudio(uri);
        const categories = await categorizeText(text);
        const title = await generateTitle(text);

        finalRecording.transcription = text;
        finalRecording.categories = categories;
        finalRecording.title = title;
        finalRecording.status = 'completed';
      } catch (error) {
        console.error('Transcription error:', error);
        finalRecording.status = 'completed';
        finalRecording.transcription = 'Transcription failed';
      }

      // Update to use Zustand store
      addRecording(finalRecording);
      
      setRecording(null);
      setCurrentRecording(null);
      setRecordingState('idle');
      setTransitionState('none');
      setAudioLevel(0);
      setRecordingDuration(0);
    } catch (error) {
      console.error('Failed to stop recording:', error);
    }
  }, [recording, currentRecording, recordingDuration, addRecording]);

  return {
    recordingState,
    currentRecording,
    transcription,
    audioLevel,
    recordingDuration,
    startRecording,
    stopRecording,
    deleteRecording,
    transitionState,
  };
}; 