import { TextInput, View, Text } from 'react-native';
import { cn } from '../../lib/utils';
import { useTheme } from '../../contexts/ThemeContext';

interface InputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  className?: string;
  error?: string;
}

export function Input({
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  keyboardType = 'default',
  autoCapitalize = 'none',
  className,
  error,
}: InputProps) {
  const { theme: colors } = useTheme();
  return (
    <View>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        className={cn(
          'border border-gray-300 rounded-lg px-4 py-3 text-base',
          error && 'border-red-500',
          className
        )}
        placeholderTextColor={colors.textSecondary}
      />
      {error && (
        <Text className="text-red-500 text-sm mt-1">{error}</Text>
      )}
    </View>
  );
}

