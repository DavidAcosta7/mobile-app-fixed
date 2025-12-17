import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/ui/Card';
import { Header } from '../components/Header';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { achievementService, Achievement } from '../services/achievements.service';
import { supabase } from '../lib/supabase';
import { useTheme } from '../contexts/ThemeContext';

export default function AchievementsScreen() {
  const { user } = useAuth();
  const { theme: colors } = useTheme();
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);

  const totals = useMemo(() => {
    const total = achievements.length;
    const unlocked = achievements.filter(a => a.unlocked).length;
    return { total, unlocked };
  }, [achievements]);

  const loadAchievements = async () => {
    try {
      if (!user?.id) {
        setLoading(false);
        return;
      }
      setLoading(true);

      const list = await achievementService.findByUserId(user.id);
      if (list.length === 0) {
        await achievementService.initializeDefaultAchievements(user.id);
      }
      const refreshed = await achievementService.findByUserId(user.id);
      setAchievements(refreshed);
    } catch (e) {
      console.error('Error loading achievements:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAchievements();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`achievements-screen-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'achievements',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void loadAchievements();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Ionicons name="trophy" size={32} color={colors.primary} style={styles.titleIcon} />
            <Text style={[styles.title, { color: colors.text }]}>Logros</Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Desbloquea logros pagando a tiempo
          </Text>
          <View style={[styles.badge, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.badgeText, { color: colors.textSecondary }]}>
              {totals.unlocked}/{totals.total} Logros
            </Text>
          </View>
        </View>

        {/* Achievement Cards */}
        <View style={styles.achievementsContainer}>
          {loading ? (
            <Card style={styles.achievementCard}>
              <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                <ActivityIndicator color={colors.primary} />
              </View>
            </Card>
          ) : achievements.length === 0 ? (
            <Card style={styles.achievementCard}>
              <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                <Ionicons name="trophy-outline" size={28} color={colors.textSecondary} />
                <Text style={[styles.achievementDesc, { color: colors.textSecondary }]}>Aún no hay logros</Text>
              </View>
            </Card>
          ) : (
            achievements.map((achievement) => (
              <Card key={achievement.id} style={styles.achievementCard}>
                <View style={styles.achievementHeader}>
                  <View
                    style={[
                      styles.iconContainer,
                      {
                        backgroundColor: achievement.unlocked ? '#D1FAE5' : colors.border,
                      },
                    ]}
                  >
                    <Ionicons
                      name={achievement.unlocked ? 'trophy-outline' : 'lock-closed'}
                      size={28}
                      color={achievement.unlocked ? '#10B981' : colors.textSecondary}
                    />
                  </View>
                  <View style={styles.achievementInfo}>
                    <Text style={[styles.achievementTitle, { color: colors.text }]}>{achievement.title}</Text>
                    <Text
                      style={[
                        styles.achievementStatus,
                        { color: achievement.unlocked ? '#10B981' : colors.textSecondary },
                      ]}
                    >
                      {achievement.unlocked ? '¡Desbloqueado!' : 'Bloqueado'}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.achievementXP,
                      { color: achievement.unlocked ? '#10B981' : colors.textSecondary },
                    ]}
                  >
                    +{achievement.points} XP
                  </Text>
                </View>

                <Text style={[styles.achievementDesc, { color: colors.textSecondary }]}>{achievement.description}</Text>
              </Card>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  achievementsContainer: {
    gap: 12,
  },
  achievementCard: {
    padding: 16,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  achievementStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  achievementXP: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  achievementDesc: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
  },
  progressText: {
    fontSize: 12,
  },
});

