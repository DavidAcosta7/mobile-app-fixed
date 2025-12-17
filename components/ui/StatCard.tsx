import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'orange' | 'red' | 'green';
}

const COLORS = {
  blue: '#2563EB',
  orange: '#F97316',
  red: '#EF4444',
  green: '#10B981',
};

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  '💳': 'card',
  '⏱️': 'time',
  '🔴': 'alert-circle',
  '💰': 'cash',
  // Mapeo directo de nombres de iconos
  'card': 'card',
  'time': 'time',
  'alert-circle': 'alert-circle',
  'cash': 'cash',
};

export function StatCard({ label, value, icon, color }: StatCardProps) {
  const { theme: colors, resolvedMode } = useTheme();
  const iconName = ICON_MAP[icon] || 'help-circle-outline';
  
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          shadowOpacity: resolvedMode === 'dark' ? 0 : 0.1,
        },
      ]}
    >
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
        <Ionicons name={iconName as any} size={20} color={COLORS[color]} />
      </View>
      <Text style={[styles.value, { color: COLORS[color] }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    minWidth: '48%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    flex: 1,
    marginBottom: 8,
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
  },
  value: {
    fontSize: 22,
    fontWeight: 'bold',
  },
});

