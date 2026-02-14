// components/DailyLimitModal.tsx
import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';

interface DailyLimitModalProps {
  visible: boolean;
  onClose: () => void;
  colors: {
    card: string;
    background: string;
    text: string;
    subtext: string;
    active: string;
  };
  dailyLimit?: number;
  customMessage?: string;
}

export const DailyLimitModal: React.FC<DailyLimitModalProps> = ({
  visible,
  onClose,
  colors,
  dailyLimit = 10,
  customMessage,
}) => {
  const { t } = useTranslation();

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View
          style={[styles.limitModalContent, { backgroundColor: colors.card }]}
          onStartShouldSetResponder={() => true}
        >
          <View
            style={[
              styles.limitModalIcon,
              { backgroundColor: colors.background },
            ]}
          >
            <Text style={styles.limitModalIconText}>⏰</Text>
          </View>
          <Text style={[styles.limitModalTitle, { color: colors.text }]}>
            {t('DailyLimitModal.title')}
          </Text>
          <Text style={[styles.limitModalMessage, { color: colors.subtext }]}>
            {customMessage || t('DailyLimitModal.message', { dailyLimit })}
          </Text>
          <TouchableOpacity
            style={[
              styles.limitModalButton,
              { backgroundColor: colors.active },
            ]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text
              style={[
                styles.limitModalButtonText,
                { color: colors.background },
              ]}
            >
              {t('DailyLimitModal.close')}
            </Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  } as ViewStyle,
  limitModalContent: {
    margin: 20,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 280,
  } as ViewStyle,
  limitModalIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  } as ViewStyle,
  limitModalIconText: {
    fontSize: 32,
  } as TextStyle,
  limitModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  } as TextStyle,
  limitModalMessage: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  } as TextStyle,
  limitModalButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    minWidth: 120,
  } as ViewStyle,
  limitModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  } as TextStyle,
});