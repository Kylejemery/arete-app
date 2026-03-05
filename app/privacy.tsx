import React from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';

export default function PrivacyScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Privacy Policy</Text>
      <Text style={styles.updated}>Last updated March 5, 2026</Text>

      <Text style={styles.paragraph}>
        Arete ("the App") is a personal excellence app. This Privacy Policy explains what information is collected, how it is used, and your rights.
      </Text>

      <Text style={styles.heading}>Information We Collect</Text>
      <Text style={styles.paragraph}>
        The App collects the following information:
      </Text>
      <View style={styles.list}>
        <Text style={styles.listItem}>• Your first name — entered during setup and stored locally on your device only.</Text>
        <Text style={styles.listItem}>• Personal profile information — background, goals, and reflections; stored locally.</Text>
        <Text style={styles.listItem}>• Journal entries — stored locally on your device only.</Text>
        <Text style={styles.listItem}>• Messages to the Cabinet — messages and relevant profile context may be sent to Anthropic's API to generate responses.</Text>
      </View>

      <Text style={styles.heading}>How We Use Your Information</Text>
      <Text style={styles.paragraph}>
        Your profile and journal data remains on your device and is not transmitted to our servers. When you use the Cabinet feature, your message and a summary of profile context may be sent to Anthropic; see Anthropic's Privacy Policy for details.
      </Text>

      <Text style={styles.heading}>Data Storage</Text>
      <Text style={styles.paragraph}>
        Personal data is stored locally (AsyncStorage). Deleting the app removes local data.
      </Text>

      <Text style={styles.heading}>Children's Privacy</Text>
      <Text style={styles.paragraph}>
        The App is not intended for children under 13. We do not knowingly collect information from children under 13.
      </Text>

      <Text style={styles.heading}>Contact</Text>
      <Text style={styles.paragraph}>Contact: you@yourdomain.com</Text>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 20, backgroundColor: '#0f1724' },
  title: { fontSize: 24, fontWeight: '700', color: '#c9a84c', marginBottom: 6 },
  updated: { color: '#9aa0a6', marginBottom: 18 },
  heading: { marginTop: 18, color: '#c9a84c', fontWeight: '600' },
  paragraph: { color: '#e6eef8', marginTop: 8, lineHeight: 20 },
  list: { marginTop: 8 },
  listItem: { color: '#e6eef8', marginBottom: 8 },
});
