import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '../components/ui/Card';
import { Header } from '../components/Header';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { achievementService, Achievement } from '../services/achievements.service';
import { supabase } from '../lib/supabase';

export default function AchievementsScreen() {
  const { user } = useAuth();
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
    <View style={styles.container}>
      <Header />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <Ionicons name="trophy" size={32} color="#2563EB" style={styles.titleIcon} />
            <Text style={styles.title}>Logros</Text>
          </View>
          <Text style={styles.subtitle}>
            Desbloquea logros pagando a tiempo
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {totals.unlocked}/{totals.total} Logros
            </Text>
          </View>
        </View>

        {/* Achievement Cards */}
        <View style={styles.achievementsContainer}>
          {loading ? (
            <Card style={styles.achievementCard}>
              <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                <ActivityIndicator color="#2563EB" />
              </View>
            </Card>
          ) : achievements.length === 0 ? (
            <Card style={styles.achievementCard}>
              <View style={{ alignItems: 'center', paddingVertical: 10 }}>
                <Ionicons name="trophy-outline" size={28} color="#9CA3AF" />
                <Text style={styles.achievementDesc}>Aún no hay logros</Text>
              </View>
            </Card>
          ) : (
            achievements.map((achievement) => (
              <Card key={achievement.id} style={styles.achievementCard}>
                <View style={styles.achievementHeader}>
                  <View
                    style={[
                      styles.iconContainer,
                      achievement.unlocked ? styles.iconUnlocked : styles.iconLocked,
                    ]}
                  >
                    <Ionicons
                      name={achievement.unlocked ? 'trophy-outline' : 'lock-closed'}
                      size={28}
                      color={achievement.unlocked ? '#10B981' : '#9CA3AF'}
                    />
                  </View>
                  <View style={styles.achievementInfo}>
                    <Text style={styles.achievementTitle}>{achievement.title}</Text>
                    <Text
                      style={[
                        styles.achievementStatus,
                        achievement.unlocked ? styles.statusUnlocked : styles.statusLocked,
                      ]}
                    >
                      {achievement.unlocked ? '¡Desbloqueado!' : 'Bloqueado'}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.achievementXP,
                      achievement.unlocked ? styles.xpUnlocked : styles.xpLocked,
                    ]}
                  >
                    +{achievement.points} XP
                  </Text>
                </View>

                <Text style={styles.achievementDesc}>{achievement.description}</Text>
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
    backgroundColor: '#F9FAFB',
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
    color: '#111827',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 12,
  },
  badge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#92400E',
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
  iconLocked: {
    backgroundColor: '#E5E7EB',
  },
  iconUnlocked: {
    backgroundColor: '#D1FAE5',
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  achievementStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusLocked: {
    color: '#6B7280',
  },
  statusUnlocked: {
    color: '#10B981',
  },
  achievementXP: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  xpLocked: {
    color: '#9CA3AF',
  },
  xpUnlocked: {
    color: '#10B981',
  },
  achievementDesc: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
    lineHeight: 20,
  },
  progressContainer: {
    marginTop: 8,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#3B82F6',
  },
  progressText: {
    fontSize: 12,
    color: '#6B7280',
  },
});

