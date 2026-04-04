import React from 'react';
import Svg, { Circle, Path, Defs, LinearGradient, Stop } from 'react-native-svg';

interface LogoProps {
  size?: number;
}

/**
 * zkTalk app icon as an SVG component.
 * Based on zktalk-mark.svg — gradient circle with chat bubble + face.
 */
export default function Logo({ size = 72 }: LogoProps) {
  const scale = size / 512;

  return (
    <Svg width={size} height={size} viewBox="0 0 512 512" fill="none">
      <Circle cx="256" cy="256" r="212" fill="url(#grad)" />
      <Path
        d="M132 180C132 152.386 154.386 130 182 130H330C357.614 130 380 152.386 380 180V304C380 331.614 357.614 354 330 354H264L202 410C191.052 419.915 173.25 412.148 173.25 397.344V354H182C154.386 354 132 331.614 132 304V180Z"
        fill="#EEF2FF"
      />
      <Circle cx="221" cy="239" r="35" fill="#4F46E5" />
      <Circle cx="291" cy="239" r="35" fill="#4F46E5" />
      <Path
        d="M189 306C189 286.118 205.118 270 225 270H287C306.882 270 323 286.118 323 306V314H189V306Z"
        fill="#4F46E5"
      />
      <Defs>
        <LinearGradient id="grad" x1="90" y1="82" x2="422" y2="430" gradientUnits="userSpaceOnUse">
          <Stop stopColor="#818CF8" />
          <Stop offset="1" stopColor="#4F46E5" />
        </LinearGradient>
      </Defs>
    </Svg>
  );
}
