

import React from 'react';
import { Icon } from 'react-native-paper';
import { StyleProp, TextStyle } from 'react-native';

interface TabBarIconProps {
  name: string;
  style?: StyleProp<TextStyle>;
  color?: string;
  size?: number;
}

export function TabBarIcon({ name, style, color = 'black', size = 28 }: TabBarIconProps) {
  return (
    <Icon
      source={name}
      size={size}
      color={color}
      style={[{ marginBottom: -3 }, style]}
    />
  );
}

