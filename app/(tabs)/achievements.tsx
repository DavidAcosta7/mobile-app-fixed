import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Card } from '../../components/ui/Card';

export default function AchievementsScreen() {
  const achievements = [
    { 
      id: 1, 
      title: 'Primer pago', 
      desc: 'Completa tu primer pago a tiempo', 
      icon: '🎯', 
      locked: true, 
      xp: 50,
      progress: 0,
      total: 1
    },
    { 
      id: 2, 
      title: 'Racha 3 días', 
      desc: 'Paga a tiempo 3 días consecutivos', 
      icon: '🔥', 
      locked: true, 
      xp: 100,
      progress: 0,
      total: 3
    },
    { 
      id: 3, 
      title: 'Racha 7 días', 
      desc: 'Paga a tiempo 7 días consecutivos', 
      icon: '⭐', 
      locked: true, 
      xp: 200,
      progress: 0,
      total: 7
    },
    { 
      id: 4, 
      title: 'Racha 30 días', 
      desc: 'Paga a tiempo 30 días consecutivos', 
      icon: '👑', 
      locked: true, 
      xp: 500,
      progress: 0,
      total: 30
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>🏆 Logros</Text>
          <Text style={styles.subtitle}>
            Desbloquea logros pagando a tiempo
          </Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>0/26 Logros</Text>
          </View>
        </View>

        {/* Achievement Cards */}
        <View style={styles.achievementsContainer}>
          {achievements.map((achievement) => (
            <Card key={achievement.id} style={styles.achievementCard}>
              <View style={styles.achievementHeader}>
                <View style={[
                  styles.iconContainer,
                  achievement.locked ? styles.iconLocked : styles.iconUnlocked
                ]}>
                  <Text style={styles.achievementIconText}>
                    {achievement.locked ? '🔒' : achievement.icon}
                  </Text>
                </View>
                <View style={styles.achievementInfo}>
                  <Text style={styles.achievementTitle}>{achievement.title}</Text>
                  <Text style={[
                    styles.achievementStatus,
                    achievement.locked ? styles.statusLocked : styles.statusUnlocked
                  ]}>
                    {achievement.locked ? 'Bloqueado' : '¡Desbloqueado!'}
                  </Text>
                </View>
                <Text style={[
                  styles.achievementXP,
                  achievement.locked ? styles.xpLocked : styles.xpUnlocked
                ]}>
                  +{achievement.xp} XP
                </Text>
              </View>
              
              <Text style={styles.achievementDesc}>{achievement.desc}</Text>
              
              {achievement.locked && (
                <View style={styles.progressContainer}>
                  <View style={styles.progressBarBg}>
                    <View 
                      style={[
                        styles.progressBarFill,
                        { width: `${(achievement.progress / achievement.total) * 100}%` }
                      ]} 
                    />
                  </View>
                  <Text style={styles.progressText}>
                    {achievement.progress}/{achievement.total} completado
                  </Text>
                </View>
              )}
            </Card>
          ))}
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
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
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
  achievementIconText: {
    fontSize: 28,
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
