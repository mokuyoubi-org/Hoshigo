// src/components/ProFeatureGate.tsx
import React, { type ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRevenueCat } from '../hooks/useRevenueCat';

interface ProFeatureGateProps {
  children: ReactNode;
  onUpgradePress: () => void;
}

export default function ProFeatureGate({ 
  children, 
  onUpgradePress 
}: ProFeatureGateProps): React.JSX.Element {
  const { isPro, loading } = useRevenueCat();

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!isPro) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🔒 この機能はPro限定です</Text>
        <TouchableOpacity
          onPress={onUpgradePress}
          style={styles.button}
        >
          <Text style={styles.buttonText}>Proにアップグレード</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    marginBottom: 10,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});