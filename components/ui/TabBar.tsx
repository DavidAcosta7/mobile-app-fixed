import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

interface TabBarProps {
  tabs: string[];
  activeTab: string;
  onTabPress: (tab: string) => void;
}

export function TabBar({ tabs, activeTab, onTabPress }: TabBarProps) {
  const { theme: colors, resolvedMode } = useTheme();
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          shadowOpacity: resolvedMode === 'dark' ? 0 : 0.05,
        },
      ]}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab;
        return (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, isActive && { backgroundColor: colors.primary }]}
            onPress={() => onTabPress(tab)}
          >
            <Text
              style={[
                styles.tabText,
                { color: colors.textSecondary },
                isActive && styles.activeTabText,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
});

