/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

const tintColorLight = '#6D56F2';
const tintColorDark = '#fff';
const gold = "#e5c650"

export const Colors = {
  light: {
    gold: gold,
    dark: '#c3c3c3',
    text: '#6D56F2',
    background: '#fff',
    lighterTint: '#ecebff',
    tint: tintColorLight,
    icon: '#6D56F2',
    tabIconDefault: '#6D56F2',
    tabIconSelected: tintColorLight,
  },
  dark: {
    gold: gold,
    dark: '#c3c3c3',
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};
