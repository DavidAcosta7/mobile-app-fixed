import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';

export function Header() {
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    setShowProfileMenu(false);
    await signOut();
  };

  const isAdmin = user?.user_metadata?.role === 'ADMIN';

  return (
    <View style={styles.header}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>💳</Text>
        <Text style={styles.logoText}>FLUXPAY</Text>
      </View>

      {/* Right Actions */}
      <View style={styles.actions}>
        {/* Tema Claro/Oscuro */}
        <TouchableOpacity 
          style={styles.iconButton}
          onPress={() => {
            setIsDarkMode(!isDarkMode);
            // TODO: Implementar cambio de tema
          }}
        >
          <Text style={styles.icon}>{isDarkMode ? '🌙' : '☀️'}</Text>
        </TouchableOpacity>

        {/* Notificaciones */}
        <TouchableOpacity 
          style={styles.iconButton}
          onPress={() => {
            // TODO: Abrir historial de notificaciones
          }}
        >
          <Text style={styles.icon}>🔔</Text>
        </TouchableOpacity>

        {/* Perfil */}
        <TouchableOpacity 
          style={styles.profileButton}
          onPress={() => setShowProfileMenu(true)}
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.user_metadata?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

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
          <View style={styles.menuContainer}>
            {/* Header del Menu */}
            <View style={styles.menuHeader}>
              <View style={styles.menuAvatar}>
                <Text style={styles.menuAvatarText}>
                  {user?.user_metadata?.name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                </Text>
              </View>
              <View style={styles.menuUserInfo}>
                <Text style={styles.menuUserName}>
                  {user?.user_metadata?.name || user?.email || 'Usuario'}
                </Text>
                <Text style={styles.menuUserEmail}>{user?.email}</Text>
                <View style={styles.menuUserStats}>
                  <Text style={styles.menuUserLevel}>Nivel 99</Text>
                  <Text style={styles.menuUserXP}>99999 XP</Text>
                </View>
              </View>
            </View>

            {/* Opciones del Menu */}
            <View style={styles.menuItems}>
              {isAdmin && (
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => {
                    setShowProfileMenu(false);
                    router.push('/admin');
                  }}
                >
                  <Text style={styles.menuItemIcon}>⚙️</Text>
                  <Text style={styles.menuItemText}>Panel de Administración</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  setShowProfileMenu(false);
                  router.push('/achievements');
                }}
              >
                <Text style={styles.menuItemIcon}>🏆</Text>
                <Text style={styles.menuItemText}>Tus logros</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  setShowProfileMenu(false);
                  router.push('/profile');
                }}
              >
                <Text style={styles.menuItemIcon}>👤</Text>
                <Text style={styles.menuItemText}>Mi Perfil</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.menuItem}
                onPress={() => {
                  setShowProfileMenu(false);
                  // TODO: Abrir historial de notificaciones
                }}
              >
                <Text style={styles.menuItemIcon}>🔔</Text>
                <Text style={styles.menuItemText}>Historial de notificaciones</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.menuItem, styles.menuItemDanger]}
                onPress={handleLogout}
              >
                <Text style={styles.menuItemIcon}>🚪</Text>
                <Text style={[styles.menuItemText, styles.menuItemTextDanger]}>
                  Cerrar sesión
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  logo: {
    fontSize: 24,
  },
  logoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2563EB',
    letterSpacing: 1,
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

