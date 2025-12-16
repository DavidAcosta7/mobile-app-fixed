import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Image, Platform, StatusBar } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export function Header() {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const { user, signOut, refreshUser } = useAuth();
  const router = useRouter();
  const { mode, resolvedMode, setMode, theme } = useTheme();

  const handleLogout = async () => {
    setShowProfileMenu(false);
    await signOut();
  };

  const displayName = user?.name || 'Usuario';
  const displayEmail = user?.email || '';
  const level = user?.financial_level ?? 1;
  const xp = user?.experience_points ?? 0;

  return (
    <SafeAreaView
      edges={['top']}
      style={[
        styles.safeArea,
        {
          paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) + 10 : 10,
          backgroundColor: theme.card,
        },
      ]}
    >
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }] }>
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </View>

        {/* Right Actions */}
        <View style={styles.actions}>
        {/* Tema Claro/Oscuro */}
        <TouchableOpacity 
          style={styles.iconButton}
          onPress={() => {
            setShowThemeModal(true);
          }}
        >
          <Ionicons
            name={resolvedMode === 'dark' ? 'moon-outline' : 'sunny-outline'}
            size={24}
            color={theme.text}
          />
        </TouchableOpacity>

        {/* Notificaciones */}
        <TouchableOpacity 
          style={styles.iconButton}
          onPress={() => {
            router.push('/notifications');
          }}
        >
          <Ionicons name="notifications-outline" size={24} color={theme.text} />
        </TouchableOpacity>

        {/* Perfil */}
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => {
            setShowProfileMenu(true);
            void refreshUser();
          }}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {displayName.charAt(0) || displayEmail.charAt(0) || 'U'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Modal Tema */}
      <Modal
        visible={showThemeModal}
        animationType="fade"
        transparent
        onRequestClose={() => setShowThemeModal(false)}
      >
        <TouchableOpacity
          style={styles.themeOverlay}
          activeOpacity={1}
          onPress={() => setShowThemeModal(false)}
        >
          <View style={[styles.themeSheet, { backgroundColor: theme.card, borderColor: theme.border }] }>
            <View style={styles.themeHeaderRow}>
              <View style={styles.themeTitleRow}>
                <Ionicons name="color-palette-outline" size={20} color={theme.text} />
                <Text style={[styles.themeTitle, { color: theme.text }]}>Tema</Text>
              </View>
              <TouchableOpacity onPress={() => setShowThemeModal(false)}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.themeSubtitle, { color: theme.textSecondary }]}>
              Elige cómo quieres ver la app
            </Text>

            <View style={styles.themeOptions}>
              <TouchableOpacity
                style={[
                  styles.themeOption,
                  { borderColor: theme.border, backgroundColor: mode === 'light' ? (resolvedMode === 'dark' ? '#111827' : '#EFF6FF') : 'transparent' },
                ]}
                activeOpacity={0.85}
                onPress={() => setMode('light')}
              >
                <View style={styles.themeOptionLeft}>
                  <View style={[styles.themeIconPill, { backgroundColor: '#EFF6FF' }]}>
                    <Ionicons name="sunny-outline" size={18} color={theme.primary} />
                  </View>
                  <View>
                    <Text style={[styles.themeOptionTitle, { color: theme.text }]}>Claro</Text>
                    <Text style={[styles.themeOptionDesc, { color: theme.textSecondary }]}>Fondo claro</Text>
                  </View>
                </View>
                {mode === 'light' ? (
                  <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                ) : (
                  <Ionicons name="ellipse-outline" size={20} color={theme.textSecondary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.themeOption,
                  { borderColor: theme.border, backgroundColor: mode === 'dark' ? (resolvedMode === 'dark' ? '#1F2937' : '#F3F4F6') : 'transparent' },
                ]}
                activeOpacity={0.85}
                onPress={() => setMode('dark')}
              >
                <View style={styles.themeOptionLeft}>
                  <View style={[styles.themeIconPill, { backgroundColor: '#111827' }]}>
                    <Ionicons name="moon-outline" size={18} color="#F9FAFB" />
                  </View>
                  <View>
                    <Text style={[styles.themeOptionTitle, { color: theme.text }]}>Oscuro</Text>
                    <Text style={[styles.themeOptionDesc, { color: theme.textSecondary }]}>Fondo oscuro</Text>
                  </View>
                </View>
                {mode === 'dark' ? (
                  <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                ) : (
                  <Ionicons name="ellipse-outline" size={20} color={theme.textSecondary} />
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.themeOption,
                  { borderColor: theme.border, backgroundColor: mode === 'system' ? (resolvedMode === 'dark' ? '#1F2937' : '#F3F4F6') : 'transparent' },
                ]}
                activeOpacity={0.85}
                onPress={() => setMode('system')}
              >
                <View style={styles.themeOptionLeft}>
                  <View style={[styles.themeIconPill, { backgroundColor: '#F3F4F6' }]}>
                    <Ionicons name="phone-portrait-outline" size={18} color={theme.text} />
                  </View>
                  <View>
                    <Text style={[styles.themeOptionTitle, { color: theme.text }]}>Automático</Text>
                    <Text style={[styles.themeOptionDesc, { color: theme.textSecondary }]}>Sigue el sistema</Text>
                  </View>
                </View>
                {mode === 'system' ? (
                  <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                ) : (
                  <Ionicons name="ellipse-outline" size={20} color={theme.textSecondary} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

        {/* Modal Menú de Perfil */}
        <Modal
          visible={showProfileMenu}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowProfileMenu(false)}
        >
          <TouchableOpacity
            style={styles.modalOverlay}
            activeOpacity={1}
            onPress={() => setShowProfileMenu(false)}
          >
            <View style={[styles.menuContainer, { backgroundColor: theme.card }] }>
              {/* Header del Menu */}
              <View style={[styles.menuHeader, { borderBottomColor: theme.border }] }>
                <View style={styles.menuAvatar}>
                  <Text style={styles.menuAvatarText}>
                    {displayName.charAt(0) || displayEmail.charAt(0) || 'U'}
                  </Text>
                </View>
                <View style={styles.menuUserInfo}>
                  <Text style={[styles.menuUserName, { color: theme.text }]}>
                    {displayName}
                  </Text>
                  <Text style={[styles.menuUserEmail, { color: theme.textSecondary }]}>{displayEmail}</Text>
                  <View style={styles.menuUserStats}>
                    <Text style={[styles.menuUserLevel, { color: theme.primary }]}>Nivel {level}</Text>
                    <Text style={[styles.menuUserXP, { color: '#10B981' }]}>{xp.toLocaleString()} XP</Text>
                  </View>
                </View>
              </View>

              {/* Opciones del Menu */}
              <View style={styles.menuItems}>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowProfileMenu(false);
                    router.push('/profile');
                  }}
                >
                  <Ionicons name="person-outline" size={24} color={theme.text} />
                  <Text style={[styles.menuItemText, { color: theme.text }]}>Mi perfil</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowProfileMenu(false);
                    router.push('/achievements');
                  }}
                >
                  <Ionicons name="trophy-outline" size={24} color={theme.text} />
                  <Text style={[styles.menuItemText, { color: theme.text }]}>Tus logros</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowProfileMenu(false);
                    router.push('/settings');
                  }}
                >
                  <Ionicons name="settings-outline" size={24} color={theme.text} />
                  <Text style={[styles.menuItemText, { color: theme.text }]}>Configuraciones</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    setShowProfileMenu(false);
                    router.push('/notifications');
                  }}
                >
                  <Ionicons name="notifications-outline" size={24} color={theme.text} />
                  <Text style={[styles.menuItemText, { color: theme.text }]}>Historial de notificaciones</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.menuItem, styles.menuItemDanger]}
                  onPress={handleLogout}
                >
                  <Ionicons name="log-out-outline" size={24} color="#EF4444" />
                  <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>
                    Cerrar sesión
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  themeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  themeSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  themeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  themeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  themeTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  themeSubtitle: {
    marginTop: 6,
    fontSize: 13,
  },
  themeOptions: {
    marginTop: 14,
    gap: 10,
  },
  themeOption: {
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  themeIconPill: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeOptionTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  themeOptionDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logoImage: {
    width: 120,
    height: 32,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconButton: {
    padding: 8,
  },
  icon: {
    fontSize: 22,
  },
  profileButton: {
    padding: 4,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 60,
    paddingRight: 16,
  },
  menuContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    minWidth: 280,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  menuHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  menuAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuAvatarText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  menuUserInfo: {
    flex: 1,
  },
  menuUserName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  menuUserEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 6,
  },
  menuUserStats: {
    flexDirection: 'row',
    gap: 12,
  },
  menuUserLevel: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
  },
  menuUserXP: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
  menuItems: {
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  menuItemIcon: {
    fontSize: 20,
    width: 24,
  },
  menuItemText: {
    fontSize: 15,
    color: '#374151',
    fontWeight: '500',
  },
  menuItemDanger: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 4,
  },
  menuItemTextDanger: {
    color: '#EF4444',
  },
});

