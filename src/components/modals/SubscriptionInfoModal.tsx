// @/src/components/modals/SubscriptionInfoModal.tsx
import { useTranslation } from "@/src/contexts/LocaleContexts";
import { translations } from "@/src/services/translations";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export type InfoModalVariant =
  | "purchaseSuccess"
  | "purchaseError"
  | "restoreSuccess"
  | "restoreEmpty"
  | "restoreError";

type SubscriptionInfoModalKey =
  `SubscriptionInfoModal.${keyof typeof translations.en.SubscriptionInfoModal}`;

interface VariantConfig {
  icon: string;
  titleKey: SubscriptionInfoModalKey;
  messageKey: SubscriptionInfoModalKey;
  buttonLabelKey: SubscriptionInfoModalKey;
  buttonStyle: "primary" | "outline";
  iconAccent: "brand" | "neutral";
}

const VARIANT_CONFIG: Record<InfoModalVariant, VariantConfig> = {
  purchaseSuccess: {
    icon: "check",
    titleKey: "SubscriptionInfoModal.purchaseSuccessTitle",
    messageKey: "SubscriptionInfoModal.purchaseSuccessMessage",
    buttonLabelKey: "SubscriptionInfoModal.purchaseSuccessButton",
    buttonStyle: "primary",
    iconAccent: "brand",
  },
  purchaseError: {
    icon: "⚠️",
    titleKey: "SubscriptionInfoModal.purchaseErrorTitle",
    messageKey: "SubscriptionInfoModal.purchaseErrorMessage",
    buttonLabelKey: "SubscriptionInfoModal.purchaseErrorButton",
    buttonStyle: "outline",
    iconAccent: "neutral",
  },
  restoreSuccess: {
    icon: "check",
    titleKey: "SubscriptionInfoModal.restoreSuccessTitle",
    messageKey: "SubscriptionInfoModal.restoreSuccessMessage",
    buttonLabelKey: "SubscriptionInfoModal.restoreSuccessButton",
    buttonStyle: "primary",
    iconAccent: "brand",
  },
  restoreEmpty: {
    icon: "📭",
    titleKey: "SubscriptionInfoModal.restoreEmptyTitle",
    messageKey: "SubscriptionInfoModal.restoreEmptyMessage",
    buttonLabelKey: "SubscriptionInfoModal.restoreEmptyButton",
    buttonStyle: "outline",
    iconAccent: "neutral",
  },
  restoreError: {
    icon: "⚠️",
    titleKey: "SubscriptionInfoModal.restoreErrorTitle",
    messageKey: "SubscriptionInfoModal.restoreErrorMessage",
    buttonLabelKey: "SubscriptionInfoModal.restoreErrorButton",
    buttonStyle: "outline",
    iconAccent: "neutral",
  },
};

export type SubscriptionInfoModalProps = {
  visible: boolean;
  variant: InfoModalVariant;
  overrideMessage?: string;
  onClose: () => void;
  colors: {
    card: string;
    text: string;
    subtext: string;
    background: string;
    active: string;
  };
};

export const SubscriptionInfoModal: React.FC<SubscriptionInfoModalProps> = ({
  visible,
  variant,
  overrideMessage,
  onClose,
  colors,
}) => {
  const { t } = useTranslation();
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const checkAnim = useRef(new Animated.Value(0)).current;

  const config = VARIANT_CONFIG[variant];
  const isBrandAccent = config.iconAccent === "brand";
  const isPrimaryButton = config.buttonStyle === "primary";
  const isCheckIcon = config.icon === "check";

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 80,
          friction: 8,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        Animated.spring(checkAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 100,
          friction: 6,
        }).start();
      });
    } else {
      scaleAnim.setValue(0.8);
      opacityAnim.setValue(0);
      checkAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View
          style={[
            styles.modalContent,
            { backgroundColor: colors.card },
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <Animated.View
            style={[
              styles.iconWrapper,
              {
                backgroundColor: isBrandAccent
                  ? colors.active + "1A"
                  : colors.subtext + "18",
              },
              { transform: [{ scale: checkAnim }] },
            ]}
          >
            <View
              style={[
                styles.iconCircle,
                {
                  backgroundColor: isBrandAccent
                    ? colors.active
                    : colors.subtext + "55",
                },
              ]}
            >
              {isCheckIcon ? (
                <Text style={styles.checkmark}>✓</Text>
              ) : (
                <Text style={styles.emoji}>{config.icon}</Text>
              )}
            </View>
          </Animated.View>

          <Text style={[styles.title, { color: colors.text }]}>
            {t(config.titleKey)}
          </Text>
          <Text style={[styles.message, { color: colors.subtext }]}>
            {overrideMessage ?? t(config.messageKey)}
          </Text>

          <TouchableOpacity
            style={[
              styles.button,
              isPrimaryButton
                ? { backgroundColor: colors.active }
                : {
                    backgroundColor: "transparent",
                    borderWidth: 1.5,
                    borderColor: colors.subtext + "55",
                  },
            ]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text
              style={[
                styles.buttonText,
                { color: isPrimaryButton ? "#fff" : colors.text },
              ]}
            >
              {t(config.buttonLabelKey)}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    borderRadius: 20,
    overflow: "hidden",
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 28,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconWrapper: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  checkmark: {
    color: "#fff",
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 36,
  },
  emoji: {
    fontSize: 30,
    lineHeight: 36,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 10,
    letterSpacing: 0.3,
    textAlign: "center",
  },
  message: {
    fontSize: 15,
    lineHeight: 24,
    textAlign: "center",
    marginBottom: 28,
  },
  button: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
