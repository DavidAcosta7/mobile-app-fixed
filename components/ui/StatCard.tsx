import { View, Text, StyleSheet } from 'react-native';

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

export function StatCard({ label, value, icon, color }: StatCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={[styles.value, { color: COLORS[color] }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    flex: 1,
    minWidth: '45%',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
  },
  icon: {
    fontSize: 24,
  },
  value: {
    fontSize: 28,
    fontWeight: 'bold',
  },
});

