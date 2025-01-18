import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Platform, Animated, Easing, Dimensions, TextInput, KeyboardAvoidingView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface FABAction {
  id: string;
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}

export const FloatingActionButton = () => {
  const insets = useSafeAreaInsets();
  const [isOpen, setIsOpen] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showFeedbackNotification, setShowFeedbackNotification] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const menuAnim = useRef(new Animated.Value(0)).current;

  const actions: FABAction[] = [
    {
      id: 'settings',
      icon: 'settings-outline',
      label: 'Settings',
      color: '#795548',
      onPress: () => setShowSettingsModal(true),
    },
    {
      id: 'stats',
      icon: 'stats-chart',
      label: 'Stats',
      color: '#9C27B0',
      onPress: () => console.log('Stats pressed'),
    },
    {
      id: 'help',
      icon: 'help-circle-outline',
      label: 'Help',
      color: '#4CAF50',
      onPress: () => setShowHelpModal(true),
    },
  ];
  
  // Individual menu item animations
  const menuItemAnims = useRef(actions.map(() => new Animated.Value(0))).current;

  const toggleMenu = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const toValue = isOpen ? 0 : 1;

    // Staggered animation for menu items
    const menuItemAnimations = menuItemAnims.map((anim, index) =>
      Animated.spring(anim, {
        toValue,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
        delay: index * 50, // Stagger the animations
      })
    );

    Animated.parallel([
      Animated.spring(menuAnim, {
        toValue,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue,
        tension: 40,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue,
        duration: 200,
        easing: Easing.bezier(0.4, 0.0, 0.2, 1),
        useNativeDriver: true,
      }),
      ...menuItemAnimations,
    ]).start();

    setIsOpen(!isOpen);
  };

  const handleActionPress = async (action: FABAction) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    action.onPress();
    toggleMenu();
  };

  return (
    <>
      <View style={styles.container}>
        <Animated.View style={[styles.menuContainer, {
          opacity: menuAnim,
          transform: [
            { scale: menuAnim },
            { translateY: menuAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [20, 0],
            })},
          ],
        }]}>
          {actions.map((action, index) => (
            <Animated.View
              key={action.id}
              style={{
                opacity: menuItemAnims[index],
                transform: [
                  { scale: menuItemAnims[index] },
                  { translateX: menuItemAnims[index].interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  })},
                ],
              }}
            >
              <TouchableOpacity
                style={[styles.menuItem]}
                onPress={() => handleActionPress(action)}
              >
                <View style={[styles.menuButton, { backgroundColor: action.color }]}>
                  <Ionicons name={action.icon as any} size={24} color="#fff" />
                </View>
                <Animated.View style={[styles.menuLabelContainer, {
                  opacity: menuItemAnims[index],
                  transform: [{ scale: menuItemAnims[index] }],
                }]}>
                  <Text style={styles.menuLabel}>{action.label}</Text>
                </Animated.View>
              </TouchableOpacity>
            </Animated.View>
          ))}
        </Animated.View>
        <TouchableOpacity
          style={[styles.fab, isOpen && styles.fabActive]}
          onPress={toggleMenu}
          activeOpacity={0.8}
        >
          <Animated.View style={{
            transform: [{
              rotate: rotateAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '45deg'],
              }),
            }],
          }}>
            <Ionicons name="add" size={24} color="#fff" />
          </Animated.View>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showHelpModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowHelpModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Help & Tips</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowHelpModal(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.heroSection}>
              <LinearGradient
                colors={['#6B9FFF', '#4B7BFF']}
                style={styles.heroBackground}
              >
                <View style={styles.heroContent}>
                  <View style={styles.welcomeIcon}>
                    <Text style={{ fontSize: 40 }}>✨</Text>
                  </View>
                  <Text style={styles.heroTitle}>Welcome to AIdeaVoice</Text>
                  <Text style={styles.heroSubtitle}>Your AI-powered voice assistant</Text>
                </View>
              </LinearGradient>
            </View>

            <Text style={styles.sectionTitle}>Quick Start 🚀</Text>
            {[
              { text: 'Tap the mic to start recording', icon: '🎙️', bg: '#E3F2FD' },
              { text: 'Speak your thoughts clearly', icon: '🗣️', bg: '#E8F5E9' },
              { text: 'Let AI organize for you', icon: '✨', bg: '#FFF3E0' },
              { text: 'Ask questions to get instant answers', icon: '❓', bg: '#FFEBEE' },
              { text: 'Use voice commands for hands-free operation', icon: '👐', bg: '#E1F5FE' },
              { text: 'Explore features by tapping the settings icon', icon: '⚙️', bg: '#F1F8E9' },
            ].map((step, index) => (
              <View key={index} style={styles.stepItem}>
                <View style={[styles.stepIconContainer, { backgroundColor: step.bg }]}>
                  <Text style={{ fontSize: 24 }}>{step.icon}</Text>
                </View>
                <Text style={styles.stepText}>{step.text}</Text>
              </View>
            ))}

            <Text style={styles.sectionTitle}>Tips for Effective Use 💡</Text>
            {[
              { text: 'Keep your device close for better recognition', icon: '📱', bg: '#FFCCBC' },
              { text: 'Speak clearly and at a moderate pace', icon: '🗣️', bg: '#D1C4E9' },
              { text: 'Use specific commands for better results', icon: '🔍', bg: '#C8E6C9' },
              { text: 'Experiment with different phrases', icon: '🧪', bg: '#FFEB3B' },
            ].map((tip, index) => (
              <View key={index} style={styles.stepItem}>
                <View style={[styles.stepIconContainer, { backgroundColor: tip.bg }]}>
                  <Text style={{ fontSize: 24 }}>{tip.icon}</Text>
                </View>
                <Text style={styles.stepText}>{tip.text}</Text>
              </View>
            ))}

            {/* Rest of the modal content follows the same pattern */}
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showContactModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowContactModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Contact Us 📩</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setShowContactModal(false)}
            >
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <Text style={styles.contactText}>
              We value your feedback! Please let us know how we can improve your experience.
            </Text>
            <TextInput
              style={styles.input}
              placeholder="Your message..."
              multiline
              numberOfLines={4}
            />
            <TouchableOpacity style={styles.submitButton} onPress={() => {
              // Handle feedback submission
              console.log('Feedback submitted');
              setShowContactModal(false);
            }}>
              <Text style={styles.submitButtonText}>Submit Feedback</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal
        visible={showSettingsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSettingsModal(false)}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Settings ⚙️</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => setShowSettingsModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.modalContent} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.heroSection}>
                <LinearGradient
                  colors={['#FF6B6B', '#4ECDC4']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.heroBackground, { height: 160 }]}
                >
                  <View style={styles.heroContent}>
                    <Text style={[styles.heroTitle, { fontSize: 24 }]}>AIdeaVoice</Text>
                    <Text style={styles.heroSubtitle}>Version {Constants.expoConfig?.version || '1.0.0'}</Text>
                  </View>
                </LinearGradient>
              </View>

              <Text style={styles.sectionTitle}>About AIdeaVoice 🎙️</Text>
              <View style={styles.stepItem}>
                <View style={[styles.stepIconContainer, { backgroundColor: '#E3F2FD' }]}>
                  <Text style={{ fontSize: 24 }}>✨</Text>
                </View>
                <Text style={styles.stepText}>
                  Transform your voice into organized thoughts with AI-powered transcription and analysis.
                </Text>
              </View>

              <Text style={styles.sectionTitle}>Settings & Preferences ⚙️</Text>
              {[
                { 
                  text: 'Notification Settings (Coming Soon)', 
                  icon: '🔔', 
                  bg: '#E8F5E9',
                  disabled: true 
                },
                { 
                  text: 'Theme Settings (Coming Soon)', 
                  icon: '🎨', 
                  bg: '#E1F5FE',
                  disabled: true 
                },
              ].map((setting, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.stepItem,
                    setting.disabled && { opacity: 0.6 }
                  ]}
                >
                  <View style={[styles.stepIconContainer, { backgroundColor: setting.bg }]}>
                    <Text style={{ fontSize: 24 }}>{setting.icon}</Text>
                  </View>
                  <Text style={styles.stepText}>{setting.text}</Text>
                  {setting.disabled && (
                    <View style={styles.comingSoonBadge}>
                      <Text style={styles.comingSoonText}>Coming Soon</Text>
                    </View>
                  )}
                </View>
              ))}

              <Text style={styles.sectionTitle}>Support & Feedback 💬</Text>
              <View style={styles.contactSection}>
                <Text style={styles.contactText}>
                  We value your feedback! Please let us know how we can improve your experience.
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="Your message..."
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
                <TouchableOpacity 
                  style={styles.submitButton}
                  onPress={() => {
                    setShowFeedbackNotification(true);
                    setTimeout(() => {
                      setShowFeedbackNotification(false);
                    }, 2000);
                  }}
                >
                  <Text style={styles.submitButtonText}>Submit Feedback</Text>
                </TouchableOpacity>

                {showFeedbackNotification && (
                  <Animated.View style={styles.notificationContainer}>
                    <LinearGradient
                      colors={['#4CAF50', '#45A049']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.notification}
                    >
                      <View style={styles.notificationContent}>
                        <Ionicons name="checkmark-circle" size={28} color="#fff" />
                        <Text style={styles.notificationText}>
                          Thanks for your feedback! We'll review it carefully 🙌
                        </Text>
                      </View>
                    </LinearGradient>
                  </Animated.View>
                )}
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    alignItems: 'flex-end',
    zIndex: 1000,
  },
  fab: {
    backgroundColor: '#F44336',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  fabActive: {
    backgroundColor: '#666',
    transform: [{ scale: 1.1 }],
  },
  menuContainer: {
    position: 'absolute',
    bottom: 70,
    right: 0,
    marginBottom: 16,
    alignItems: 'flex-end',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    transform: [{ scale: 1 }],
  },
  menuButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  menuLabelContainer: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginLeft: 8,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  menuLabel: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    backgroundColor: '#fff',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
    marginLeft: 20,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
    flex: 1,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  welcomeIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  welcomeSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  featureCard: {
    width: '46%',
    aspectRatio: 1,
    padding: 20,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  featureCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  featureCardText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  tipsList: {
    gap: 16,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    marginHorizontal: 2,
  },
  tipIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  tipText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    fontWeight: '500',
  },
  gesturesList: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 20,
    gap: 16,
  },
  gestureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  gestureText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 16,
    flex: 1,
  },
  supportSection: {
    marginVertical: 32,
    width: '100%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  supportBackground: {
    width: '100%',
    padding: 32,
  },
  supportContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  supportTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginVertical: 16,
    textAlign: 'center',
  },
  supportButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  supportButtonText: {
    color: '#2196F3',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  versionText: {
    fontSize: 16,
    color: '#666',
  },
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  heroSection: {
    height: 220,
    margin: 20,
    borderRadius: 24,
    overflow: 'hidden',
  },
  heroBackground: {
    flex: 1,
  },
  heroContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 18,
    color: '#fff',
    opacity: 0.9,
    textAlign: 'center',
    lineHeight: 24,
  },
  quickStartSection: {
    margin: 20,
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  quickStartTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
  },
  stepsList: {
    gap: 16,
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  stepIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  stepText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
    fontWeight: '500',
  },
  featuresSection: {
    padding: 20,
  },
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 16,
  },
  tipsSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  tipsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginHorizontal: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  featureEmoji: {
    fontSize: 32,
    marginBottom: 12,
  },
  tipEmoji: {
    fontSize: 24,
    marginRight: 16,
  },
  supportEmoji: {
    fontSize: 40,
    marginBottom: 16,
  },
  input: {
    height: 120,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginVertical: 16,
    backgroundColor: '#f9f9f9',
    textAlignVertical: 'top',
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  contactText: {
    fontSize: 16,
    color: '#333',
    margin: 20,
    textAlign: 'center',
  },
  comingSoonBadge: {
    backgroundColor: '#FFE0B2',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  comingSoonText: {
    fontSize: 12,
    color: '#F57C00',
    fontWeight: '600',
  },
  notificationContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 1000,
  },
  notification: {
    width: '100%',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  notificationText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
    flex: 1,
  },
  contactSection: {
    padding: 20,
    paddingBottom: 40,
  },
});