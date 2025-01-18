import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Speaker } from '../types/analysis';

interface MeetingReplayProps {
  speakers: Speaker[];
}

const MeetingReplay: React.FC<MeetingReplayProps> = ({ speakers }) => {
  return (
    <ScrollView style={styles.container}>
      {speakers.map((speaker, speakerIndex) => (
        <View key={speakerIndex} style={styles.speakerContainer}>
          {speaker.lines.map((line, lineIndex) => (
            <View key={lineIndex} style={styles.lineContainer}>
              <LinearGradient
                colors={['#E3F2FD', '#BBDEFB']}
                style={styles.speakerBubble}
              >
                <Text style={styles.speakerName}>{speaker.name}</Text>
                <Text style={styles.lineText}>{line.text}</Text>
                <Text style={styles.timestamp}>
                  {new Date(line.timestamp * 1000).toISOString().substr(14, 5)}
                </Text>
              </LinearGradient>
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  speakerContainer: {
    marginBottom: 16,
  },
  lineContainer: {
    marginBottom: 8,
  },
  speakerBubble: {
    padding: 12,
    borderRadius: 12,
    maxWidth: '80%',
  },
  speakerName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  lineText: {
    fontSize: 16,
  },
  timestamp: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
});

export default MeetingReplay; 