import React, { useState, useCallback, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Share, Platform, NativeModules, Alert, Animated } from 'react-native';
import { Audio } from 'expo-av';
import { Ionicons } from '@expo/vector-icons';
import { Recording } from '../types/recording';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import * as Haptics from 'expo-haptics';

interface Props {
  recording: Recording;
  onDelete: (id: string) => void;
  onPress: () => void;
}

export const RecordingListItem: React.FC<Props> = ({ recording, onDelete, onPress }) => {
  const swipeableRef = useRef<Swipeable>(null);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const getDeviceLocale = () => {
    try {
      if (Platform.OS === 'ios') {
        return (
          NativeModules.SettingsManager?.settings?.AppleLocale ||
          NativeModules.SettingsManager?.settings?.AppleLanguages[0] ||
          'en_US'
        );
      } else {
        return NativeModules.I18nManager?.localeIdentifier || 'en_US';
      }
    } catch (error) {
      return 'en_US';
    }
  };

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [sound]);

  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Date unavailable';
      }
      return date.toLocaleDateString(getDeviceLocale(), {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Date formatting error:', error);
      return 'Date unavailable';
    }
  };

  const formatDuration = (duration: number) => {
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handlePlay = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (isPlaying && sound) {
        await sound.stopAsync();
        await sound.unloadAsync();
        setSound(null);
        setIsPlaying(false);
        return;
      }

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: recording.uri },
        { 
          shouldPlay: true,
          volume: 1.0,
          progressUpdateIntervalMillis: 100,
          androidImplementation: 'MediaPlayer',
          isMuted: false,
        }
      );

      setSound(newSound);
      setIsPlaying(true);

      newSound.setOnPlaybackStatusUpdate(status => {
        if (status.isLoaded) {
          if (status.didJustFinish) {
            setIsPlaying(false);
            newSound.unloadAsync();
            setSound(null);
          }
        }
      });
    } catch (error) {
      console.error('Error playing sound:', error);
      setIsPlaying(false);
    }
  };

  const handleShare = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await Share.share({
        url: recording.uri,
        message: recording.transcription || 'Voice Recording',
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const handleDelete = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Alert.alert(
      "Delete Recording",
      "Are you sure you want to delete this recording?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          onPress: async () => {
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            onDelete(recording.id);
          },
          style: "destructive"
        }
      ]
    );
  };

  const renderRightActions = (
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const scale = dragX.interpolate({
      inputRange: [-130, -50, 0],
      outputRange: [1, 0.95, 0.9],
      extrapolate: 'extend',
    });

    const opacity = dragX.interpolate({
      inputRange: [-100, -50, 0],
      outputRange: [1, 0.8, 0],
      extrapolate: 'extend',
    });

    return (
      <View style={styles.swipeActions}>
        <Animated.View 
          style={[
            styles.swipeActionContainer,
            {
              transform: [{ scale }],
              opacity
            }
          ]}
        >
          <RectButton 
            style={[styles.swipeAction, styles.shareAction]}
            onPress={() => {
              handleShare();
              swipeableRef.current?.close();
            }}
          >
            <Ionicons name="share-outline" size={28} color="#fff" />
          </RectButton>
          <RectButton 
            style={[styles.swipeAction, styles.deleteAction]}
            onPress={() => {
              handleDelete();
              swipeableRef.current?.close();
            }}
          >
            <Ionicons name="trash-outline" size={28} color="#fff" />
          </RectButton>
        </Animated.View>
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      friction={3}
      rightThreshold={50}
      overshootRight={false}
      enableTrackpadTwoFingerGesture
      containerStyle={styles.swipeableContainer}
    >
      <TouchableOpacity 
        onPress={onPress} 
        style={[
          styles.container,
        ]}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={[styles.date]}>
              {formatDate(recording.timestamp.toString())}
            </Text>
            <TouchableOpacity onPress={handlePlay}>
              <Ionicons 
                name={isPlaying ? 'pause-circle' : 'play-circle'} 
                size={32} 
                color="#007AFF" 
              />
            </TouchableOpacity>
          </View>
          {recording.title && (
            <Text style={[styles.title]} numberOfLines={1}>
              {recording.title}
            </Text>
          )}
          {recording.transcription && (
            <Text style={[styles.transcription]} numberOfLines={2}>
              {recording.transcription}
            </Text>
          )}
          <View style={styles.categories}>
            {(recording.categories || ['General']).map(category => (
              <View key={category} style={styles.categoryTag}>
                <Text style={styles.categoryText}>{category}</Text>
              </View>
            ))}
          </View>
          <View style={styles.durationContainer}>
            <Ionicons name="time-outline" color="#666" />
            <Text style={[styles.duration]}>
              {formatDuration(recording.duration)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    marginVertical: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 10,
  },
  date: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 8,
    textAlign: 'left',
  },
  darkText: {
    color: '#FFFFFF',
  },
  darkSubtext: {
    color: '#AAAAAA',
  },
  transcription: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 12,
    lineHeight: 22,
    textAlign: 'left',
  },
  categories: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryTag: {
    backgroundColor: '#E1F5FE',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  categoryText: {
    color: '#0288D1',
    fontSize: 12,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 16,
    marginTop: 12,
  },
  durationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  duration: {
    fontSize: 12,
    color: '#666666',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'left',
  },
  swipeActions: {
    height: '100%',
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: 4,
  },
  swipeActionContainer: {
    flexDirection: 'row',
    height: '100%',
  },
  swipeAction: {
    width: 75,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    marginHorizontal: 2,
  },
  shareAction: {
    backgroundColor: '#2196F3',
  },
  deleteAction: {
    backgroundColor: '#F44336',
  },
  actionText: {
    color: '#fff',
    fontSize: 12,
    marginTop: 4,
  },
  swipeableContainer: {
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
}); 