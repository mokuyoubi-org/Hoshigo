// // src/screens/PaywallScreen.tsx
// import React from 'react';
// import RevenueCatUI from 'react-native-purchases-ui';
// import { View, StyleSheet } from 'react-native';
// import { useRevenueCat } from '../src/hooks/useRevenueCat';

// interface PaywallScreenProps {
//   onDismiss?: () => void;
// }

// export default function PaywallScreen({ onDismiss }: PaywallScreenProps): React.JSX.Element {
//   const { refreshStatus } = useRevenueCat();

//   // 🔧 引数の形式を修正：オブジェクト形式で受け取る
//   const handlePurchase = async ({ customerInfo }: { customerInfo: any }): Promise<void> => {
//     console.log('✅ Purchase completed!', customerInfo);
    
//     if (customerInfo.entitlements.active['Hoshigo Pro']) {
//       await refreshStatus();
//       onDismiss?.();
//     }
//   };

//   // 🔧 引数の形式を修正：オブジェクト形式で受け取る
//   const handleRestore = ({ customerInfo }: { customerInfo: any }): void => {
//     console.log('✅ Restore completed', customerInfo);
//     refreshStatus().then(() => {
//       onDismiss?.();
//     });
//   };

//   return (
//     <View style={styles.container}>
//       <RevenueCatUI.Paywall
//         onPurchaseCompleted={handlePurchase}
//         onRestoreCompleted={handleRestore}
//         onDismiss={onDismiss}
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//   },
// });