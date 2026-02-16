// src/screens/CustomerCenterScreen.tsx
import React from 'react';
import RevenueCatUI from 'react-native-purchases-ui';
import { View, StyleSheet } from 'react-native';

interface CustomerCenterScreenProps {
  onDismiss?: () => void;
}

export default function CustomerCenterScreen({ 
  onDismiss 
}: CustomerCenterScreenProps): React.JSX.Element {
  return (
    <View style={styles.container}>
      {/* 🔧 CustomerCenter → CustomerCenterView に修正 */}
      <RevenueCatUI.CustomerCenterView onDismiss={onDismiss} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});