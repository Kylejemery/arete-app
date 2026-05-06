import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';

interface State {
  hasError: boolean;
  error: string;
  stack: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false, error: '', stack: '' };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error: error.message || 'Unknown error',
      stack: error.stack || '',
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <ScrollView style={styles.container}>
          <Text style={styles.title}>🔴 Startup Error</Text>
          <Text style={styles.label}>Message:</Text>
          <Text style={styles.error}>{this.state.error}</Text>
          <Text style={styles.label}>Stack:</Text>
          <Text style={styles.stack}>{this.state.stack}</Text>
        </ScrollView>
      );
    }
    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', padding: 20, paddingTop: 60 },
  title: { color: '#ff4444', fontSize: 20, fontWeight: 'bold', marginBottom: 16 },
  label: { color: '#888', fontSize: 12, marginTop: 12, marginBottom: 4 },
  error: { color: '#fff', fontSize: 14 },
  stack: { color: '#aaa', fontSize: 11, fontFamily: 'monospace' },
});
