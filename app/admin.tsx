import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ActivityIndicator,
  TextInput,
  Modal
} from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  email_verified: boolean;
  created_at: string;
  suspended: boolean;
}

export default function AdminScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showXPModal, setShowXPModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [xpAmount, setXpAmount] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los usuarios');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCleanDatabase = () => {
    Alert.alert(
      'Limpiar Base de Datos',
      '⚠️ Esta acción eliminará TODOS los datos excepto usuarios. ¿Continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Limpiar',
          style: 'destructive',
          onPress: async () => {
            try {
              // Eliminar pagos
              await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
              // Eliminar logros
              await supabase.from('achievements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
              // Eliminar rachas
              await supabase.from('streaks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
              // Eliminar notificaciones
              await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');
              
              Alert.alert('Éxito', 'Base de datos limpiada correctamente');
            } catch (error) {
              Alert.alert('Error', 'No se pudo limpiar la base de datos');
              console.error(error);
            }
          }
        }
      ]
    );
  };

  const handleValidateUnify = () => {
    Alert.alert('Próximamente', 'Funcionalidad de validación en desarrollo');
  };

  const handleViewUser = (user: User) => {
    Alert.alert(
      'Detalles del Usuario',
      `Nombre: ${user.name}\nEmail: ${user.email}\nRol: ${user.role}\nVerificado: ${user.email_verified ? 'Sí' : 'No'}`
    );
  };

  const handleAssignXP = (user: User) => {
    setSelectedUser(user);
    setShowXPModal(true);
  };

  const handleSaveXP = async () => {
    if (!selectedUser || !xpAmount) {
      Alert.alert('Error', 'Ingresa una cantidad de XP');
      return;
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ 
          experience_points: parseInt(xpAmount) 
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      Alert.alert('Éxito', `${xpAmount} XP asignados a ${selectedUser.name}`);
      setShowXPModal(false);
      setXpAmount('');
      loadUsers();
    } catch (error) {
      Alert.alert('Error', 'No se pudo asignar XP');
      console.error(error);
    }
  };

  const handleChangePassword = (user: User) => {
    Alert.alert('Próximamente', 'Funcionalidad de cambio de contraseña en desarrollo');
  };

  const handleSuspendUser = async (user: User) => {
    Alert.alert(
      user.suspended ? 'Reactivar Usuario' : 'Suspender Usuario',
      `¿Estás seguro que deseas ${user.suspended ? 'reactivar' : 'suspender'} a ${user.name}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: user.suspended ? 'Reactivar' : 'Suspender',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('users')
                .update({ suspended: !user.suspended })
                .eq('id', user.id);

              if (error) throw error;

              Alert.alert('Éxito', `Usuario ${user.suspended ? 'reactivado' : 'suspendido'}`);
              loadUsers();
            } catch (error) {
              Alert.alert('Error', 'No se pudo actualizar el usuario');
              console.error(error);
            }
          }
        }
      ]
    );
  };

  const handleDeleteUser = async (user: User) => {
    Alert.alert(
      'Eliminar Usuario',
      `⚠️ Esta acción eliminará permanentemente a ${user.name}. ¿Continuar?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', user.id);

              if (error) throw error;

              Alert.alert('Éxito', 'Usuario eliminado correctamente');
              loadUsers();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el usuario');
              console.error(error);
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Volver al Dashboard</Text>
        </TouchableOpacity>
        <Text style={styles.title}>⚙️ Panel de Administración</Text>

        {/* Admin Credentials Card */}
        <Card style={styles.credentialsCard}>
          <Text style={styles.credentialsTitle}>Credenciales de Administrador</Text>
          <View style={styles.credentialRow}>
            <Text style={styles.credentialLabel}>Email:</Text>
            <Text style={styles.credentialValue}>{user?.email}</Text>
          </View>
          <View style={styles.credentialRow}>
            <Text style={styles.credentialLabel}>Contraseña:</Text>
            <Text style={styles.credentialValue}>FluxPay2024!</Text>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity 
            style={styles.dangerButton}
            onPress={handleCleanDatabase}
          >
            <Text style={styles.dangerButtonText}>🗑️ Limpiar Base de Datos</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={loadUsers}
          >
            <Text style={styles.primaryButtonText}>🔄 Actualizar</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.secondaryButton}
            onPress={handleValidateUnify}
          >
            <Text style={styles.secondaryButtonText}>✓ Validar y Unificar</Text>
          </TouchableOpacity>
        </View>

        {/* Users List */}
        <Text style={styles.sectionTitle}>
          Usuarios Registrados ({users.length})
        </Text>
        {users.map((userItem) => (
          <Card key={userItem.id} style={styles.userCard}>
            <View style={styles.userHeader}>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{userItem.name}</Text>
                {userItem.email_verified && (
                  <View style={styles.verifiedBadge}>
                    <Text style={styles.verifiedText}>✓ Verificado</Text>
                  </View>
                )}
              </View>
            </View>
            <Text style={styles.userEmail}>{userItem.email}</Text>
            <Text style={styles.userDate}>
              Registrado: {new Date(userItem.created_at).toLocaleDateString()}
            </Text>

            {/* Action Buttons */}
            <View style={styles.userActions}>
              <TouchableOpacity 
                style={styles.actionButtonSmall}
                onPress={() => handleViewUser(userItem)}
              >
                <Text style={styles.actionButtonSmallText}>👁️ Ver</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButtonSmall}
                onPress={() => handleAssignXP(userItem)}
              >
                <Text style={styles.actionButtonSmallText}>⭐ Asignar XP</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButtonSmall}
                onPress={() => handleChangePassword(userItem)}
              >
                <Text style={styles.actionButtonSmallText}>🔑 Contraseña</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.actionButtonSmall, userItem.suspended && styles.actionButtonWarning]}
                onPress={() => handleSuspendUser(userItem)}
              >
                <Text style={styles.actionButtonSmallText}>
                  {userItem.suspended ? '✓ Reactivar' : '⛔ Suspender'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButtonDanger}
                onPress={() => handleDeleteUser(userItem)}
              >
                <Text style={styles.actionButtonDangerText}>🗑️ Eliminar</Text>
              </TouchableOpacity>
            </View>
          </Card>
        ))}
      </ScrollView>

      {/* Modal Asignar XP */}
      <Modal
        visible={showXPModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowXPModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.xpModalContainer}>
            <Text style={styles.xpModalTitle}>Asignar XP</Text>
            <Text style={styles.xpModalSubtitle}>
              Usuario: {selectedUser?.name}
            </Text>
            <TextInput
              style={styles.xpInput}
              placeholder="Cantidad de XP"
              keyboardType="numeric"
              value={xpAmount}
              onChangeText={setXpAmount}
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.xpModalButtons}>
              <TouchableOpacity
                style={styles.xpModalCancel}
                onPress={() => {
                  setShowXPModal(false);
                  setXpAmount('');
                }}
              >
                <Text style={styles.xpModalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.xpModalSave}
                onPress={handleSaveXP}
              >
                <Text style={styles.xpModalSaveText}>Asignar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 16,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 16,
    color: '#2563EB',
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 20,
  },
  credentialsCard: {
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#EFF6FF',
  },
  credentialsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1E40AF',
    marginBottom: 12,
  },
  credentialRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  credentialLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    width: 100,
  },
  credentialValue: {
    fontSize: 14,
    color: '#6B7280',
    flex: 1,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  dangerButton: {
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    minWidth: '30%',
  },
  dangerButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    minWidth: '30%',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: '#6B7280',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    minWidth: '30%',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  userCard: {
    padding: 16,
    marginBottom: 12,
  },
  userHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  verifiedBadge: {
    backgroundColor: '#DBEAFE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 11,
    color: '#1E40AF',
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  userDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginBottom: 12,
  },
  userActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  actionButtonSmall: {
    backgroundColor: '#F3F4F6',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  actionButtonSmallText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  actionButtonWarning: {
    backgroundColor: '#FEF3C7',
  },
  actionButtonDanger: {
    backgroundColor: '#FEE2E2',
  },
  actionButtonDangerText: {
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  xpModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  xpModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  xpModalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  xpInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  xpModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  xpModalCancel: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  xpModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  xpModalSave: {
    flex: 1,
    backgroundColor: '#2563EB',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  xpModalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
