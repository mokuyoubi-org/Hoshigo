/**
 * Divider.tsx
 * 【役割】画面の区切り線（ディバイダー）
 */
import React from 'react';
import { View, ViewProps } from 'react-native';

interface DividerProps extends ViewProps {
  className?: string;
}

export const Divider = ({ className = '', ...props }: DividerProps) => {
  return (
    <View
      className={`h-[1px] w-full bg-backgroundDark ${className}`}
      {...props}
    />
  );
};