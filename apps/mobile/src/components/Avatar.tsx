import React, { memo } from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { colors, getAvatarColor } from '../theme';

interface AvatarProps {
  name: string;
  avatarUrl?: string | null;
  size?: number;
  isOnline?: boolean;
}

const Avatar = memo(function Avatar({ name, avatarUrl, size = 44, isOnline }: AvatarProps) {
  const bgColor = getAvatarColor(name);
  const initial = name.charAt(0).toUpperCase();
  const fontSize = size * 0.42;

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={[
            styles.circle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
            },
          ]}
        />
      ) : (
        <View
          style={[
            styles.circle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              backgroundColor: bgColor,
            },
          ]}
        >
          <Text style={[styles.initial, { fontSize }]}>{initial}</Text>
        </View>
      )}
      {isOnline !== undefined && (
        <View
          style={[
            styles.indicator,
            {
              width: size * 0.3,
              height: size * 0.3,
              borderRadius: size * 0.15,
              borderWidth: size * 0.05,
              backgroundColor: isOnline ? colors.online : colors.offline,
              bottom: 0,
              right: 0,
            },
          ]}
        />
      )}
    </View>
  );
});

export default Avatar;

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  circle: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initial: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  indicator: {
    position: 'absolute',
    borderColor: colors.talkBackground,
  },
});
