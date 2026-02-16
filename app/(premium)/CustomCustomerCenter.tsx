// src/screens/CustomCustomerCenterScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRevenueCat } from '../../src/hooks/useRevenueCat';
import { useTheme } from '../../src/hooks/useTheme';

interface CustomCustomerCenterScreenProps {
  onDismiss?: () => void;
}

export default function CustomCustomerCenterScreen({ 
  onDismiss 
}: CustomCustomerCenterScreenProps): React.JSX.Element {
  const { customerInfo, isPro, refreshStatus } = useRevenueCat();
  const { colors } = useTheme();
  const [loading, setLoading] = useState(false);

  // Pro会員じゃない場合
  if (!customerInfo || !isPro) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onDismiss}>
            <Text style={[styles.backButton, { color: colors.active }]}>
              ‹ 戻る
            </Text>
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.subtext }]}>
            サブスクリプションがありません
          </Text>
        </View>
      </View>
    );
  }

  // Hoshigo Pro Entitlementを取得
  const proEntitlement = customerInfo.entitlements.active['Hoshigo Pro'];
  
  // サブスク情報
  const expirationDate = proEntitlement?.expirationDate 
    ? new Date(proEntitlement.expirationDate)
    : null;
  
  const willRenew = proEntitlement?.willRenew ?? false;
  const productIdentifier = proEntitlement?.productIdentifier ?? 'unknown';
  
  // プラン名を表示用に変換
  const getPlanName = (id: string) => {
    if (id === 'monthly') return '月額プラン';
    if (id === 'yearly') return '年額プラン';
    if (id === 'lifetime') return '買い切りプラン';
    return 'プラン';
  };

  // Google Play Storeのサブスク管理画面を開く
  const openSubscriptionManagement = () => {
    const url = 'https://play.google.com/store/account/subscriptions';
    Linking.openURL(url).catch(() =>
      Alert.alert('エラー', 'サブスク管理画面を開けませんでした')
    );
  };

  // 状態を更新
  const handleRefresh = async () => {
    setLoading(true);
    await refreshStatus();
    setLoading(false);
    Alert.alert('更新完了', 'サブスク状態を更新しました');
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
    >
      {/* ヘッダー */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onDismiss}>
          <Text style={[styles.backButton, { color: colors.active }]}>
            ‹ 戻る
          </Text>
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          サブスクリプション管理
        </Text>
      </View>

      {/* Pro会員バッジ */}
      <View style={[
        styles.badge, 
        { backgroundColor: colors.card, borderColor: colors.borderColor }
      ]}>
        <Text style={styles.badgeEmoji}>✨</Text>
        <Text style={[styles.badgeText, { color: colors.text }]}>
          Hoshigo Pro 会員
        </Text>
      </View>

      {/* 現在のプラン */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.subtext }]}>
          現在のプラン
        </Text>
        <View style={[
          styles.card, 
          { backgroundColor: colors.card, borderColor: colors.borderColor }
        ]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>
            {getPlanName(productIdentifier)}
          </Text>
          
          {expirationDate && productIdentifier !== 'lifetime' && (
            <>
              <Text style={[styles.cardSubtext, { color: colors.subtext }]}>
                {willRenew ? '次回更新日' : '有効期限'}
              </Text>
              <Text style={[styles.cardValue, { color: colors.text }]}>
                {expirationDate.toLocaleDateString('ja-JP', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </>
          )}
          
          {productIdentifier === 'lifetime' && (
            <Text style={[styles.cardSubtext, { color: colors.subtext }]}>
              永久アクセス
            </Text>
          )}
        </View>
      </View>

      {/* ステータス */}
      {productIdentifier !== 'lifetime' && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.subtext }]}>
            ステータス
          </Text>
          <View style={[
            styles.card, 
            { backgroundColor: colors.card, borderColor: colors.borderColor }
          ]}>
            <Text style={[styles.cardLabel, { color: colors.subtext }]}>
              自動更新
            </Text>
            <Text style={[
              styles.cardValue, 
              { color: willRenew ? colors.active : colors.danger }
            ]}>
              {willRenew ? 'オン' : 'オフ（解約済み）'}
            </Text>
          </View>
        </View>
      )}

      {/* 操作ボタン */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.subtext }]}>
          操作
        </Text>

        {/* Google Playで管理 */}
        {productIdentifier !== 'lifetime' && (
          <TouchableOpacity
            style={[
              styles.actionButton, 
              { backgroundColor: colors.card, borderColor: colors.borderColor }
            ]}
            onPress={openSubscriptionManagement}
          >
            <Text style={[styles.actionButtonText, { color: colors.text }]}>
              Google Playでサブスクを管理
            </Text>
            <Text style={[styles.actionButtonArrow, { color: colors.subtext }]}>
              ›
            </Text>
          </TouchableOpacity>
        )}

        {/* 更新 */}
        <TouchableOpacity
          style={[
            styles.actionButton, 
            { backgroundColor: colors.card, borderColor: colors.borderColor }
          ]}
          onPress={handleRefresh}
          disabled={loading}
        >
          <View style={styles.actionButtonContent}>
            <Text style={[styles.actionButtonText, { color: colors.text }]}>
              状態を更新
            </Text>
            {loading && <ActivityIndicator size="small" color={colors.active} />}
          </View>
        </TouchableOpacity>
      </View>

      {/* ヘルプ */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.subtext }]}>
          ヘルプ
        </Text>
        <Text style={[styles.helpText, { color: colors.subtext }]}>
          プラン変更や解約は、Google Playのサブスクリプション管理画面から行えます。
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
  },
  backButton: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 32,
  },
  badgeEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  badgeText: {
    fontSize: 20,
    fontWeight: '700',
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  cardSubtext: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  cardLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
  },
  cardValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtonArrow: {
    fontSize: 28,
    fontWeight: '300',
  },
  helpText: {
    fontSize: 14,
    lineHeight: 20,
    marginLeft: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});