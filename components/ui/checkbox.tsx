import { Pressable, View } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
}

export function Checkbox({ checked, onCheckedChange, id }: CheckboxProps) {
  const { theme: colors } = useTheme();
  return (
    <Pressable
      onPress={() => onCheckedChange(!checked)}
      className="w-5 h-5 border-2 border-gray-300 rounded items-center justify-center"
      style={{
        backgroundColor: checked ? colors.primary : 'transparent',
        borderColor: checked ? colors.primary : colors.border,
      }}
    >
      {checked && (
        <View className="w-2 h-2 bg-white rounded" />
      )}
    </Pressable>
  );
}

