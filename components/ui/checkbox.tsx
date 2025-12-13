import { Pressable, View } from 'react-native';
import { cn } from '../../lib/utils';

interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  id?: string;
}

export function Checkbox({ checked, onCheckedChange, id }: CheckboxProps) {
  return (
    <Pressable
      onPress={() => onCheckedChange(!checked)}
      className="w-5 h-5 border-2 border-gray-300 rounded items-center justify-center"
      style={{
        backgroundColor: checked ? '#2563EB' : 'transparent',
        borderColor: checked ? '#2563EB' : '#D1D5DB',
      }}
    >
      {checked && (
        <View className="w-2 h-2 bg-white rounded" />
      )}
    </Pressable>
  );
}

