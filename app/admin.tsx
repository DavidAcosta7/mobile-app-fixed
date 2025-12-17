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
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { useRouter } from 'expo-router';
import { supabase } from '../lib/supabase';
import { Card } from '../components/ui/Card';
import { useTheme } from '../contexts/ThemeContext';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  email_verified: boolean;
  created_at: string;
  status?: string;
  suspended_at?: string | null;
  suspended?: boolean;
  financial_level: number;
  experience_points: number;
}

interface AuditLog {
  id: string;
  admin_id: string;
  admin_name: string;
  action_type: string;
  target_user_id: string | null;
  target_user_name: string | null;
  details: any;
  created_at: string;
}

interface Reports {
  totalUsers: number;
  totalPayments: number;
  totalPendingPayments: number;
  totalUrgentPayments: number;
  totalCompletedPayments: number;
  totalFailedPayments: number;
  totalOverduePayments: number;
  totalAmount: number;
  totalPendingAmount: number;
  totalCompletedAmount: number;
  suspendedUsers: number;
  activeUsers: number;
  totalXP: number;
  averageLevel: number;
  paymentsByCategory: Record<string, number>;
  paymentsByStatus: Record<string, number>;
  usersByRole: Record<string, number>;
  recentUsersCount: number; // Usuarios registrados en los últimos 30 días
  recentPaymentsCount: number; // Pagos creados en los últimos 30 días
}

// Variable para controlar si ya se mostró el mensaje de tabla no encontrada
let auditTableWarningShown = false;

// Helper para registrar auditoría
const logAuditAction = async (
  adminId: string,
  adminName: string,
  actionType: string,
  targetUserId: string | null = null,
  targetUserName: string | null = null,
  details: any = null
) => {
  try {
    const { error } = await supabase.from('audit_logs').insert({
      admin_id: adminId,
      admin_name: adminName,
      action_type: actionType,
      target_user_id: targetUserId,
      target_user_name: targetUserName,
      details: details,
    });

    if (error) {
      // Si la tabla no existe, solo registrar en consola sin romper la app
      if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
        // Solo mostrar el mensaje una vez para no saturar la consola
        if (!auditTableWarningShown) {
          console.log('La tabla audit_logs no existe. Ejecuta la migración SQL para habilitar la auditoría completa.');
          auditTableWarningShown = true;
        }
        return;
      }
      throw error;
    }
    // Si se insertó correctamente, resetear el flag
    auditTableWarningShown = false;
  } catch (error: any) {
    // Solo registrar errores que no sean de tabla no encontrada
    if (error?.code !== 'PGRST205' && !error?.message?.includes('Could not find the table')) {
      console.error('Error logging audit action:', error);
    }
  }
};

// Helper para obtener label de acción
const getActionLabel = (actionType: string) => {
  const labels: Record<string, string> = {
    'CHANGE_PASSWORD': 'Cambió la contraseña de un usuario',
    'CHANGE_ROLE': 'Cambió el rol de un usuario',
    'ASSIGN_XP': 'Asignó puntos de experiencia',
    'CHANGE_LEVEL': 'Cambió el nivel financiero',
    'SUSPEND_USER': 'Suspendió un usuario',
    'ENABLE_USER': 'Habilitó un usuario',
    'DELETE_USER': 'Eliminó un usuario',
    'VIEW_USER': 'Vio detalles de un usuario',
  };
  return labels[actionType] || actionType;
};

// Helper para obtener color de badge de acción
const getActionColor = (actionType: string) => {
  const colors: Record<string, string> = {
    'CHANGE_PASSWORD': '#3B82F6',
    'CHANGE_ROLE': '#F59E0B',
    'ASSIGN_XP': '#10B981',
    'CHANGE_LEVEL': '#8B5CF6',
    'SUSPEND_USER': '#EF4444',
    'ENABLE_USER': '#10B981',
    'DELETE_USER': '#DC2626',
    'VIEW_USER': '#6B7280',
  };
  return colors[actionType] || '#6B7280';
};

export default function AdminScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { theme, resolvedMode } = useTheme();
  const [activeTab, setActiveTab] = useState('Usuarios');
  const [users, setUsers] = useState<User[]>([]);
  const [, setTotalUsers] = useState(0);
  const [, setActiveUsers] = useState(0);
  const [, setSuspendedUsers] = useState(0);
  const [, setTotalPayments] = useState(0);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [reports, setReports] = useState<Reports | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showViewModal, setShowViewModal] = useState(false);
  const [showXPModal, setShowXPModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [showMyPasswordModal, setShowMyPasswordModal] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [xpAmount, setXpAmount] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedRole, setSelectedRole] = useState('user');
  const [newLevel, setNewLevel] = useState('');
  const [myCurrentPassword, setMyCurrentPassword] = useState('');
  const [myNewPassword, setMyNewPassword] = useState('');
  const [myConfirmPassword, setMyConfirmPassword] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (activeTab === 'Usuarios') {
      loadUsers();
    } else if (activeTab === 'Reportes') {
      loadReports();
    } else if (activeTab === 'Auditoría') {
      loadAuditLogs();
    }
  }, [activeTab]);

  // Cargar usuarios al montar el componente
  useEffect(() => {
    void loadStats();
    void loadUsers();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('admin-users-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users' },
        () => {
          void loadStats();
          if (activeTab === 'Usuarios') {
            void loadUsers();
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [activeTab]);

  const isUserSuspended = (u: User) => {
    if (typeof u.suspended === 'boolean') return u.suspended;
    if (typeof u.status === 'string') return u.status.toLowerCase() === 'suspended';
    if (u.suspended_at != null) return true;
    return false;
  };

  const normalizeRole = (role: string | null | undefined) => {
    const r = (role || 'user').toString().toLowerCase();
    return r === 'admin' ? 'admin' : 'user';
  };

  const loadStats = async () => {
    try {
      // Total usuarios
      const { count: total, error: totalErr } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });
      if (totalErr) throw totalErr;
      setTotalUsers(total || 0);

      // Total pagos
      const { count: payments, error: paymentsErr } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true });
      if (paymentsErr) throw paymentsErr;
      setTotalPayments(payments || 0);

      // Intentar por schema nuevo (status)
      const { count: activeByStatus, error: activeErr } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      const { count: suspendedByStatus, error: suspendedErr } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'suspended');

      if (!activeErr && !suspendedErr) {
        setActiveUsers(activeByStatus || 0);
        setSuspendedUsers(suspendedByStatus || 0);
        return;
      }

      // Fallback: schema viejo (suspended boolean)
      const { count: suspendedByBool, error: suspendedBoolErr } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('suspended', true);
      if (suspendedBoolErr) throw suspendedBoolErr;
      const suspendedCount = suspendedByBool || 0;
      setSuspendedUsers(suspendedCount);
      setActiveUsers(Math.max((total || 0) - suspendedCount, 0));
    } catch (e) {
      console.error('Error loading admin stats:', e);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Load users error:', error);
        Alert.alert('Error', 'No se pudieron cargar los usuarios');
        return;
      }

      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadReports = async () => {
    try {
      setLoading(true);
      
      // Cargar todos los datos de usuarios
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, suspended, financial_level, experience_points, role, created_at');

      if (usersError) throw usersError;

      // Cargar todos los datos de pagos
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('payments')
        .select('id, status, amount, category, created_at');

      if (paymentsError) throw paymentsError;

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Cálculos de usuarios
      const totalUsers = usersData?.length || 0;
      const suspendedUsers = usersData?.filter(u => u.suspended).length || 0;
      const activeUsers = totalUsers - suspendedUsers;
      const totalXP = usersData?.reduce((sum, u) => sum + (u.experience_points || 0), 0) || 0;
      const averageLevel = usersData && usersData.length > 0
        ? usersData.reduce((sum, u) => sum + (u.financial_level || 1), 0) / usersData.length
        : 0;
      
      // Usuarios por rol
      const usersByRole: Record<string, number> = {};
      usersData?.forEach(u => {
        usersByRole[u.role] = (usersByRole[u.role] || 0) + 1;
      });

      // Usuarios recientes (últimos 30 días)
      const recentUsersCount = usersData?.filter(u => {
        const createdDate = new Date(u.created_at);
        return createdDate >= thirtyDaysAgo;
      }).length || 0;

      // Cálculos de pagos
      const totalPayments = paymentsData?.length || 0;
      const totalPendingPayments = paymentsData?.filter(p => p.status === 'PENDING').length || 0;
      const totalUrgentPayments = paymentsData?.filter(p => p.status === 'URGENT').length || 0;
      const totalCompletedPayments = paymentsData?.filter(p => p.status === 'COMPLETED').length || 0;
      const totalFailedPayments = paymentsData?.filter(p => p.status === 'FAILED').length || 0;
      const totalOverduePayments = paymentsData?.filter(p => p.status === 'OVERDUE').length || 0;

      // Montos
      const totalAmount = paymentsData?.reduce((sum, p) => sum + parseFloat(String(p.amount || 0)), 0) || 0;
      const totalPendingAmount = paymentsData
        ?.filter(p => p.status === 'PENDING' || p.status === 'URGENT')
        .reduce((sum, p) => sum + parseFloat(String(p.amount || 0)), 0) || 0;
      const totalCompletedAmount = paymentsData
        ?.filter(p => p.status === 'COMPLETED')
        .reduce((sum, p) => sum + parseFloat(String(p.amount || 0)), 0) || 0;

      // Pagos por categoría
      const paymentsByCategory: Record<string, number> = {};
      paymentsData?.forEach(p => {
        paymentsByCategory[p.category] = (paymentsByCategory[p.category] || 0) + 1;
      });

      // Pagos por estado
      const paymentsByStatus: Record<string, number> = {};
      paymentsData?.forEach(p => {
        paymentsByStatus[p.status] = (paymentsByStatus[p.status] || 0) + 1;
      });

      // Pagos recientes (últimos 30 días)
      const recentPaymentsCount = paymentsData?.filter(p => {
        const createdDate = new Date(p.created_at);
        return createdDate >= thirtyDaysAgo;
      }).length || 0;

      setReports({
        totalUsers,
        totalPayments,
        totalPendingPayments,
        totalUrgentPayments,
        totalCompletedPayments,
        totalFailedPayments,
        totalOverduePayments,
        totalAmount,
        totalPendingAmount,
        totalCompletedAmount,
        suspendedUsers,
        activeUsers,
        totalXP,
        averageLevel: Math.round(averageLevel * 10) / 10,
        paymentsByCategory,
        paymentsByStatus,
        usersByRole,
        recentUsersCount,
        recentPaymentsCount,
      });
    } catch (error) {
      console.error('Error loading reports:', error);
      Alert.alert('Error', 'No se pudieron cargar los reportes');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        // Si la tabla no existe, mostrar mensaje informativo
        if (error.code === 'PGRST205' || error.message?.includes('Could not find the table')) {
          // No mostrar warning, solo establecer array vacío
          setAuditLogs([]);
          return;
        }
        throw error;
      }
      setAuditLogs(data || []);
    } catch (error: any) {
      console.error('Error loading audit logs:', error);
      // Si es un error de tabla no encontrada, no mostrar alerta
      if (error?.code === 'PGRST205' || error?.message?.includes('Could not find the table')) {
        setAuditLogs([]);
      } else {
        Alert.alert('Error', 'No se pudieron cargar los registros de auditoría');
      }
    }
  };

  const getRoleColor = (role: string) => {
    switch ((role || '').toString().toLowerCase()) {
      case 'admin':
        return '#DC2626';
      case 'user':
        return '#10B981';
      default:
        return '#6B7280';
    }
  };

  const getRoleLabel = (role: string) => {
    switch ((role || '').toString().toLowerCase()) {
      case 'admin':
        return 'Administrador';
      case 'user':
        return 'Usuario';
      default:
        return role;
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'hoy';
    } else if (diffDays === 1) {
      return 'hace 1 día';
    } else if (diffDays < 30) {
      return `hace ${diffDays} días`;
    } else if (diffDays < 60) {
      return 'hace alrededor de 1 mes';
    } else {
      const months = Math.floor(diffDays / 30);
      return `hace alrededor de ${months} mes${months > 1 ? 'es' : ''}`;
    }
  };

  const handleViewUser = async (userItem: User) => {
    setSelectedUser(userItem);
    setShowViewModal(true);
    
    // Registrar auditoría
    if (user?.id && user?.name) {
      await logAuditAction(
        user.id,
        user.name,
        'VIEW_USER',
        userItem.id,
        userItem.name
      );
    }
  };

  const handleAssignXP = (userItem: User) => {
    setSelectedUser(userItem);
    setXpAmount('');
    setShowXPModal(true);
  };

  const handleSaveXP = async () => {
    if (!selectedUser || !xpAmount || !user) {
      Alert.alert('Error', 'Ingresa una cantidad de XP');
      return;
    }

    const delta = parseInt(xpAmount);
    if (isNaN(delta) || delta < 0) {
      Alert.alert('Error', 'Ingresa una cantidad válida de XP');
      return;
    }

    try {
      const { data: current, error: currentErr } = await supabase
        .from('users')
        .select('experience_points')
        .eq('id', selectedUser.id)
        .single();
      if (currentErr) throw currentErr;

      const oldXP = (current as any)?.experience_points ?? 0;
      const newXP = oldXP + delta;

      const { error } = await supabase
        .from('users')
        .update({ 
          experience_points: newXP 
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      // Registrar auditoría
      await logAuditAction(
        user.id,
        user.name,
        'ASSIGN_XP',
        selectedUser.id,
        selectedUser.name,
        { old_xp: oldXP, delta_xp: delta, new_xp: newXP }
      );

      Alert.alert('Éxito', `Se sumaron ${delta} XP. Total: ${newXP} XP`);
      setShowXPModal(false);
      setXpAmount('');
      setSelectedUser(null);
      await loadStats();
      await loadUsers();
    } catch (error) {
      Alert.alert('Error', 'No se pudo asignar XP');
      console.error(error);
    }
  };

  const handleChangePassword = (userItem: User) => {
    setSelectedUser(userItem);
    setNewPassword('');
    setConfirmPassword('');
    setShowPasswordModal(true);
  };

  const handleSavePassword = async () => {
    if (!selectedUser || !user) {
      Alert.alert('Error', 'No se pudo identificar el usuario');
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(selectedUser.email);
      if (error) throw error;

      await logAuditAction(
        user.id,
        user.name,
        'CHANGE_PASSWORD',
        selectedUser.id,
        selectedUser.name,
        { method: 'reset_email' }
      );

      Alert.alert('Email enviado', 'Se envió un link para cambiar la contraseña');
      setShowPasswordModal(false);
      setNewPassword('');
      setConfirmPassword('');
      setSelectedUser(null);
    } catch (error) {
      Alert.alert('Error', 'No se pudo enviar el email de restablecimiento');
      console.error(error);
    }
  };

  const handleChangeRole = (userItem: User) => {
    setSelectedUser(userItem);
    setSelectedRole(normalizeRole(userItem.role));
    setShowRoleModal(true);
  };

  const handleSaveRole = async () => {
    if (!selectedUser || !user) return;

    const currentRole = normalizeRole(selectedUser.role);
    const nextRole = normalizeRole(selectedRole);

    if (nextRole === currentRole) {
      setShowRoleModal(false);
      setSelectedUser(null);
      return;
    }

    try {
      const oldRole = selectedUser.role;

      const { error } = await supabase
        .from('users')
        .update({ role: nextRole })
        .eq('id', selectedUser.id);

      if (error) throw error;

      // Registrar auditoría
      await logAuditAction(
        user.id,
        user.name,
        'CHANGE_ROLE',
        selectedUser.id,
        selectedUser.name,
        { old_role: oldRole, new_role: nextRole }
      );

      Alert.alert('Éxito', `Rol actualizado para ${selectedUser.name}`);
      setShowRoleModal(false);
      setSelectedUser(null);
      await loadStats();
      await loadUsers();
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el rol');
      console.error(error);
    }
  };

  const handleChangeLevel = (userItem: User) => {
    setSelectedUser(userItem);
    setNewLevel(userItem.financial_level.toString());
    setShowLevelModal(true);
  };

  const handleSaveLevel = async () => {
    if (!selectedUser || !newLevel || !user) {
      Alert.alert('Error', 'Ingresa un nivel válido');
      return;
    }

    const level = parseInt(newLevel);
    if (isNaN(level) || level < 1) {
      Alert.alert('Error', 'El nivel debe ser un número mayor a 0');
      return;
    }

    try {
      const oldLevel = selectedUser.financial_level;

      const { error } = await supabase
        .from('users')
        .update({ financial_level: level })
        .eq('id', selectedUser.id);

      if (error) throw error;

      // Registrar auditoría
      await logAuditAction(
        user.id,
        user.name,
        'CHANGE_LEVEL',
        selectedUser.id,
        selectedUser.name,
        { old_level: oldLevel, new_level: level }
      );

      Alert.alert('Éxito', `Nivel actualizado para ${selectedUser.name}`);
      setShowLevelModal(false);
      setNewLevel('');
      setSelectedUser(null);
      await loadStats();
      await loadUsers();
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el nivel');
      console.error(error);
    }
  };

  const handleToggleSuspend = async (userId: string, currentStatus: boolean) => {
    try {
      const action = currentStatus ? 'habilitar' : 'suspender';

      Alert.alert(
        currentStatus ? 'Habilitar Usuario' : 'Suspender Usuario',
        `¿Estás seguro que deseas ${action} este usuario?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: currentStatus ? 'Habilitar' : 'Suspender',
            style: currentStatus ? 'default' : 'destructive',
            onPress: async () => {
              try {
                const nextSuspended = !currentStatus;
                const nowIso = new Date().toISOString();

                const previousUser = users.find((u) => u.id === userId) ?? null;

                // Optimistic UI update
                setUsers((prev) =>
                  prev.map((u) =>
                    u.id === userId
                      ? {
                          ...u,
                          suspended: nextSuspended,
                          status: nextSuspended ? 'suspended' : 'active',
                          suspended_at: nextSuspended ? nowIso : null,
                          updated_at: nowIso as any,
                        }
                      : u
                  )
                );
                setSelectedUser((prev) => {
                  if (!prev || prev.id !== userId) return prev;
                  return {
                    ...prev,
                    suspended: nextSuspended,
                    status: nextSuspended ? 'suspended' : 'active',
                    suspended_at: nextSuspended ? nowIso : null,
                  };
                });

                const fullUpdate = {
                  suspended: nextSuspended,
                  status: nextSuspended ? 'suspended' : 'active',
                  suspended_at: nextSuspended ? nowIso : null,
                  updated_at: nowIso,
                };

                // Intentar update completo (status/suspended_at + suspended) y validar retorno
                const fullRes = await supabase
                  .from('users')
                  .update(fullUpdate as any)
                  .eq('id', userId)
                  .select('*');

                let error: any = fullRes.error;
                let updatedRow: any = Array.isArray(fullRes.data) ? fullRes.data[0] : fullRes.data;

                // Fallback si la tabla no tiene columnas status/suspended_at
                if (
                  error &&
                  (String(error.code) === '42703' || String(error.message || '').toLowerCase().includes('column'))
                ) {
                  const minimalRes = await supabase
                    .from('users')
                    .update({ suspended: nextSuspended, updated_at: nowIso } as any)
                    .eq('id', userId)
                    .select('*');
                  error = minimalRes.error;
                  updatedRow = Array.isArray(minimalRes.data) ? minimalRes.data[0] : minimalRes.data;
                }

                if (error || !updatedRow) {
                  console.error('Supabase error:', error);

                  // Revert optimistic update
                  if (previousUser) {
                    setUsers((prev) => prev.map((u) => (u.id === userId ? previousUser : u)));
                    setSelectedUser((prev) => (prev && prev.id === userId ? previousUser : prev));
                  } else {
                    void loadUsers();
                  }

                  Alert.alert(
                    'Error',
                    'No se pudo actualizar el usuario. Verifica permisos/RLS en Supabase.'
                  );
                  return;
                }

                // Sync local state with the returned row (source of truth)
                setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updatedRow } : u)));
                setSelectedUser((prev) => (prev && prev.id === userId ? { ...prev, ...updatedRow } : prev));

                Alert.alert('Éxito', `Usuario ${action}do correctamente`);
              } catch (err) {
                console.error('Toggle suspend error:', err);
                Alert.alert('Error', 'Ocurrió un error');
              }
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error:', error);
    }
  };

  const handleDeleteUser = async (userItem: User) => {
    if (!user) return;

    Alert.alert(
      'Eliminar Usuario',
      `Esta acción eliminará permanentemente a ${userItem.name}. ¿Continuar?`,
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
                .eq('id', userItem.id);

              if (error) throw error;

              // Registrar auditoría
              await logAuditAction(
                user.id,
                user.name,
                'DELETE_USER',
                userItem.id,
                userItem.name
              );

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

  const handleChangeMyPassword = async () => {
    if (!myCurrentPassword || !myNewPassword || !myConfirmPassword) {
      Alert.alert('Error', 'Completa todos los campos');
      return;
    }

    if (myNewPassword.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (myNewPassword !== myConfirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    try {
      // Verificar contraseña actual
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: myCurrentPassword,
      });

      if (signInError) {
        Alert.alert('Error', 'La contraseña actual es incorrecta');
        return;
      }

      // Actualizar contraseña
      const { error: updateError } = await supabase.auth.updateUser({
        password: myNewPassword,
      });

      if (updateError) throw updateError;

      Alert.alert('Éxito', 'Tu contraseña ha sido actualizada');
      setShowMyPasswordModal(false);
      setMyCurrentPassword('');
      setMyNewPassword('');
      setMyConfirmPassword('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo actualizar la contraseña');
      console.error(error);
    }
  };

  const exportReports = async (format: 'CSV' | 'JSON') => {
    if (!reports) return;

    try {
      if (format === 'JSON') {
        const data = JSON.stringify(reports, null, 2);
        Alert.alert('Exportar JSON', 'Funcionalidad de exportación en desarrollo');
      } else {
        Alert.alert('Exportar CSV', 'Funcionalidad de exportación en desarrollo');
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo exportar el reporte');
    }
  };

  if (loading && activeTab === 'Usuarios' && users.length === 0) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => router.back()}
        >
            <Ionicons name="arrow-back" size={24} color={theme.primary} />
        </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.title, { color: theme.text }]}>Panel de Administración</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>GESTIONA LA PLATAFORMA Y MODERA CONTENIDO</Text>
          </View>
        </View>

        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: theme.card, shadowOpacity: resolvedMode === 'dark' ? 0 : 0.05 }]}>
            <View style={[styles.statIconContainer, { backgroundColor: resolvedMode === 'dark' ? theme.border : '#DBEAFE' }]}>
              <Ionicons name="people" size={24} color={theme.primary} />
          </View>
            <Text style={[styles.statValue, { color: theme.text }]}>{users.length}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Total Usuarios</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.card, shadowOpacity: resolvedMode === 'dark' ? 0 : 0.05 }]}>
            <View style={[styles.statIconContainer, { backgroundColor: resolvedMode === 'dark' ? theme.border : '#D1FAE5' }]}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
            </View>
            <Text style={[styles.statValue, { color: theme.text }]}>{users.filter((u) => !isUserSuspended(u)).length}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Usuarios Activos</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: theme.card, shadowOpacity: resolvedMode === 'dark' ? 0 : 0.05 }]}>
            <View style={[styles.statIconContainer, { backgroundColor: resolvedMode === 'dark' ? theme.border : '#FEE2E2' }]}>
              <Ionicons name="close-circle" size={24} color="#EF4444" />
            </View>
            <Text style={[styles.statValue, { color: theme.text }]}>{users.filter((u) => isUserSuspended(u)).length}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Usuarios Suspendidos</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity 
              style={[styles.tab, { backgroundColor: resolvedMode === 'dark' ? theme.border : '#F3F4F6' }, activeTab === 'Usuarios' && { backgroundColor: theme.primary }]}
              onPress={() => setActiveTab('Usuarios')}
          >
              <Text style={[styles.tabText, { color: theme.textSecondary }, activeTab === 'Usuarios' && styles.activeTabText]}>
                Usuarios
              </Text>
          </TouchableOpacity>
          <TouchableOpacity 
              style={[styles.tab, { backgroundColor: resolvedMode === 'dark' ? theme.border : '#F3F4F6' }, activeTab === 'Reportes' && { backgroundColor: theme.primary }]}
              onPress={() => setActiveTab('Reportes')}
          >
              <Text style={[styles.tabText, { color: theme.textSecondary }, activeTab === 'Reportes' && styles.activeTabText]}>
                Reportes
              </Text>
          </TouchableOpacity>
          <TouchableOpacity 
              style={[styles.tab, { backgroundColor: resolvedMode === 'dark' ? theme.border : '#F3F4F6' }, activeTab === 'Auditoría' && { backgroundColor: theme.primary }]}
              onPress={() => setActiveTab('Auditoría')}
          >
              <Text style={[styles.tabText, { color: theme.textSecondary }, activeTab === 'Auditoría' && styles.activeTabText]}>
                Auditoría
              </Text>
          </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tab, { backgroundColor: resolvedMode === 'dark' ? theme.border : '#F3F4F6' }, activeTab === 'Contraseñas' && { backgroundColor: theme.primary }]}
              onPress={() => setActiveTab('Contraseñas')}
            >
              <Text style={[styles.tabText, { color: theme.textSecondary }, activeTab === 'Contraseñas' && styles.activeTabText]}>
                Contraseñas
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Content based on active tab */}
        {activeTab === 'Usuarios' && (
          <>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Gestión de Usuarios ({users.length})
        </Text>

            {/* Buscador */}
            <View style={[styles.searchContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Ionicons name="search-outline" size={20} color={theme.textSecondary} style={styles.searchIcon} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Buscar por nombre o email..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={theme.textSecondary}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {(() => {
              const filteredUsers = users.filter((userItem) => {
                if (!searchQuery.trim()) return true;
                const query = searchQuery.toLowerCase();
                return (
                  userItem.name.toLowerCase().includes(query) ||
                  userItem.email.toLowerCase().includes(query)
                );
              });

              if (filteredUsers.length === 0) {
                return (
                  <Card style={styles.emptyCard}>
                    <Ionicons name="search-outline" size={48} color={theme.textSecondary} />
                    <Text style={[styles.emptyText, { color: theme.text }]}>No se encontraron usuarios</Text>
                    <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                      Intenta con otro término de búsqueda
                    </Text>
                  </Card>
                );
              }

              return filteredUsers.map((userItem) => (
                <TouchableOpacity 
                  key={userItem.id}
                  activeOpacity={0.7}
                  onPress={() => handleViewUser(userItem)}
                >
                  <Card style={[styles.userCard, { backgroundColor: theme.card, borderColor: theme.border }] as any}>
                    <View style={styles.userRow}>
                      <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
                        <Text style={styles.avatarText}>{getInitials(userItem.name)}</Text>
                      </View>

                      <View style={styles.userInfo}>
                        <Text style={[styles.userName, { color: theme.text }]}>{userItem.name}</Text>
                        <View style={[styles.roleBadge, { backgroundColor: getRoleColor(userItem.role) + '20' }]}>
                          <Text style={[styles.roleText, { color: getRoleColor(userItem.role) }]}>
                            {getRoleLabel(userItem.role)}
                          </Text>
                        </View>

                        <View style={styles.actionButtonsContainer}>
                          <TouchableOpacity
                            style={[
                              styles.actionButton,
                              isUserSuspended(userItem) ? styles.enableButton : styles.suspendButton,
                            ]}
                            onPress={(e) => {
                              (e as any)?.stopPropagation?.();
                              handleToggleSuspend(userItem.id, isUserSuspended(userItem));
                            }}
                          >
                            <Text style={styles.actionButtonText}>
                              {isUserSuspended(userItem) ? 'Habilitar' : 'Suspender'}
                            </Text>
                          </TouchableOpacity>

                          <View
                            style={[
                              styles.userStatItem,
                              {
                                backgroundColor: isUserSuspended(userItem) ? '#FEE2E2' : '#D1FAE5',
                                paddingHorizontal: 8,
                                paddingVertical: 4,
                                borderRadius: 8,
                              },
                            ]}
                          >
                            <Ionicons
                              name={isUserSuspended(userItem) ? 'close-circle' : 'checkmark-circle'}
                              size={14}
                              color={isUserSuspended(userItem) ? '#991B1B' : '#065F46'}
                            />
                            <Text
                              style={[
                                styles.userStatText,
                                { color: isUserSuspended(userItem) ? '#991B1B' : '#065F46' },
                              ]}
                            >
                              {isUserSuspended(userItem) ? 'Suspendido' : 'Activo'}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.userEmail, { color: theme.textSecondary }]}>{userItem.email}</Text>

                        <View style={styles.userStatsRow}>
                          <View style={[styles.userStatItem, { backgroundColor: resolvedMode === 'dark' ? theme.border : '#F3F4F6' }]}>
                            <Ionicons name="star" size={14} color="#F59E0B" />
                            <Text style={[styles.userStatText, { color: theme.text }]}>{userItem.experience_points} XP</Text>
                          </View>

                          <View style={[styles.userStatItem, { backgroundColor: resolvedMode === 'dark' ? theme.border : '#F3F4F6' }]}>
                            <Ionicons name="trending-up" size={14} color={theme.primary} />
                            <Text style={[styles.userStatText, { color: theme.text }]}>Nivel {userItem.financial_level}</Text>
                          </View>

                          {isUserSuspended(userItem) && (
                            <View style={[styles.userStatItem, { backgroundColor: '#FEE2E2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }]}> 
                              <Ionicons name="ban" size={14} color="#EF4444" />
                              <Text style={[styles.userStatText, { color: '#EF4444' }]}>Suspendido</Text>
                            </View>
                          )}
                        </View>

                        <Text style={[styles.userDate, { color: theme.textSecondary }]}>Registrado {formatDate(userItem.created_at)}</Text>
                      </View>
                    </View>
                  </Card>
                </TouchableOpacity>
              ));
            })()}
          </>
        )}

        {activeTab === 'Reportes' && (
          <>
            <View style={styles.reportsHeader}>
              <View>
                <Text style={[styles.reportsTitle, { color: theme.text }]}>Reportes y Estadísticas</Text>
                <Text style={[styles.reportsSubtitle, { color: theme.textSecondary }]}>
                  Exporta reportes de la actividad de la plataforma
            </Text>
              </View>
              <View style={styles.exportButtons}>
                <TouchableOpacity 
                  style={[styles.exportButton, { backgroundColor: resolvedMode === 'dark' ? theme.border : '#EFF6FF' }]}
                  onPress={() => exportReports('CSV')}
                >
                  <Ionicons name="download-outline" size={18} color={theme.primary} />
                  <Text style={[styles.exportButtonText, { color: theme.primary }]}>Exportar CSV</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.exportButton, { backgroundColor: resolvedMode === 'dark' ? theme.border : '#EFF6FF' }]}
                  onPress={() => exportReports('JSON')}
                >
                  <Ionicons name="download-outline" size={18} color={theme.primary} />
                  <Text style={[styles.exportButtonText, { color: theme.primary }]}>Exportar JSON</Text>
                </TouchableOpacity>
              </View>
            </View>

            {loading ? (
              <View style={styles.loadingReportsContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Cargando reportes...</Text>
              </View>
            ) : reports ? (
              <>
                <View style={styles.reportCards}>
                  <Card style={[styles.reportCard, { backgroundColor: theme.card, borderColor: theme.border }] as any}>
                    <View style={[styles.reportIconContainer, { backgroundColor: resolvedMode === 'dark' ? theme.border : '#DBEAFE' }]}>
                      <Ionicons name="people" size={32} color={theme.primary} />
                    </View>
                    <Text style={[styles.reportValue, { color: theme.text }]}>{reports.totalUsers}</Text>
                    <Text style={[styles.reportLabel, { color: theme.text }]}>Usuarios Registrados</Text>
                    <Text style={[styles.reportSubtext, { color: theme.textSecondary }]}>
                      {reports.activeUsers} activos • {reports.suspendedUsers} suspendidos
                    </Text>
                  </Card>

                  <Card style={[styles.reportCard, { backgroundColor: theme.card, borderColor: theme.border }] as any}>
                    <View style={[styles.reportIconContainer, { backgroundColor: resolvedMode === 'dark' ? theme.border : '#D1FAE5' }]}>
                      <Ionicons name="card" size={32} color="#10B981" />
                    </View>
                    <Text style={[styles.reportValue, { color: theme.text }]}>{reports.totalPayments}</Text>
                    <Text style={[styles.reportLabel, { color: theme.text }]}>Pagos Totales</Text>
                    <Text style={[styles.reportSubtext, { color: theme.textSecondary }]}>
                      {reports.totalCompletedPayments} completados • {reports.totalPendingPayments} pendientes
                    </Text>
                  </Card>

                  <Card style={[styles.reportCard, { backgroundColor: theme.card, borderColor: theme.border }] as any}>
                    <View style={[styles.reportIconContainer, { backgroundColor: resolvedMode === 'dark' ? theme.border : '#FEF3C7' }]}>
                      <Ionicons name="cash" size={32} color="#F59E0B" />
                    </View>
                    <Text style={[styles.reportValue, { color: theme.text }]}>
                      ${reports.totalAmount.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </Text>
                    <Text style={[styles.reportLabel, { color: theme.text }]}>Monto Total</Text>
                    <Text style={[styles.reportSubtext, { color: theme.textSecondary }]}>
                      ${reports.totalPendingAmount.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pendiente
                    </Text>
                  </Card>
                </View>

                {/* Gráfico de Barras con Escala Dinámica */}
                <Card style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }] as any}>
                  <Text style={[styles.chartTitle, { color: theme.text }]}>Resumen General</Text>
                  <View style={styles.barChart}>
                    {(() => {
                      const maxValue = Math.max(
                        reports.totalUsers,
                        reports.totalPayments,
                        Math.max(reports.totalXP / 100, 1)
                      );
                      const getPercentage = (value: number, max: number) => {
                        return max > 0 ? Math.min((value / max) * 100, 100) : 0;
                      };
                      
                      return (
                        <>
                          <View style={styles.barItem}>
                            <Text style={[styles.barLabel, { color: theme.textSecondary }]}>Usuarios</Text>
                            <View style={[styles.barContainer, { backgroundColor: theme.border }]}>
                              <View 
                                style={[
                                  styles.bar, 
                                  { 
                                    width: `${getPercentage(reports.totalUsers, maxValue)}%`,
                                    backgroundColor: '#2563EB'
                                  }
                                ]} 
                              />
                            </View>
                            <Text style={[styles.barValue, { color: theme.text }]}>{reports.totalUsers}</Text>
                          </View>
                          <View style={styles.barItem}>
                            <Text style={[styles.barLabel, { color: theme.textSecondary }]}>Pagos</Text>
                            <View style={[styles.barContainer, { backgroundColor: theme.border }]}>
                              <View 
                                style={[
                                  styles.bar, 
                                  { 
                                    width: `${getPercentage(reports.totalPayments, maxValue)}%`,
                                    backgroundColor: '#10B981'
                                  }
                                ]} 
                              />
                            </View>
                            <Text style={[styles.barValue, { color: theme.text }]}>{reports.totalPayments}</Text>
                          </View>
                          <View style={styles.barItem}>
                            <Text style={[styles.barLabel, { color: theme.textSecondary }]}>XP Total</Text>
                            <View style={[styles.barContainer, { backgroundColor: theme.border }]}>
                              <View 
                                style={[
                                  styles.bar, 
                                  { 
                                    width: `${getPercentage(reports.totalXP / 100, maxValue)}%`,
                                    backgroundColor: '#F59E0B'
                                  }
                                ]} 
                              />
                            </View>
                            <Text style={[styles.barValue, { color: theme.text }]}>{reports.totalXP}</Text>
                          </View>
                        </>
                      );
                    })()}
                  </View>
                </Card>

                {/* Estadísticas de Pagos por Estado */}
                <Card style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }] as any}>
                  <Text style={[styles.chartTitle, { color: theme.text }]}>Pagos por Estado</Text>
                  <View style={styles.barChart}>
                    {(() => {
                      const statusData = [
                        { label: 'Completados', value: reports.totalCompletedPayments, color: '#10B981' },
                        { label: 'Pendientes', value: reports.totalPendingPayments, color: '#F59E0B' },
                        { label: 'Urgentes', value: reports.totalUrgentPayments, color: '#EF4444' },
                        { label: 'Fallidos', value: reports.totalFailedPayments, color: '#DC2626' },
                        { label: 'Vencidos', value: reports.totalOverduePayments, color: '#991B1B' },
                      ];
                      const maxStatus = Math.max(...statusData.map(s => s.value), 1);
                      
                      return statusData.map((status, index) => (
                        <View key={index} style={styles.barItem}>
                          <Text style={[styles.barLabel, { color: theme.textSecondary }]}>{status.label}</Text>
                          <View style={[styles.barContainer, { backgroundColor: theme.border }]}>
                            <View 
                              style={[
                                styles.bar, 
                                { 
                                  width: `${maxStatus > 0 ? Math.min((status.value / maxStatus) * 100, 100) : 0}%`,
                                  backgroundColor: status.color
                                }
                              ]} 
                            />
                          </View>
                          <Text style={[styles.barValue, { color: theme.text }]}>{status.value}</Text>
                        </View>
                      ));
                    })()}
                  </View>
                </Card>

                {/* Métricas de Crecimiento */}
                <View style={styles.metricsContainer}>
                  <Card style={[styles.metricCard, { backgroundColor: theme.card, borderColor: theme.border }] as any}>
                    <View style={styles.metricHeader}>
                      <Ionicons name="trending-up-outline" size={20} color={theme.primary} />
                      <Text style={[styles.metricTitle, { color: theme.text }]}>Métricas de Crecimiento</Text>
                    </View>
                    <View style={[styles.metricItem, { borderBottomColor: theme.border }]}>
                      <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Tasa de Usuarios Activos</Text>
                      <Text style={[styles.metricValue, { color: theme.text }]}>
                        {reports.totalUsers > 0 
                          ? Math.round((reports.activeUsers / reports.totalUsers) * 100) 
                          : 0}%
                      </Text>
                    </View>
                    <View style={[styles.metricItem, { borderBottomColor: theme.border }]}>
                      <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Tasa de Completación de Pagos</Text>
                      <Text style={[styles.metricValue, { color: theme.text }]}>
                        {reports.totalPayments > 0 
                          ? Math.round((reports.totalCompletedPayments / reports.totalPayments) * 100) 
                          : 0}%
                      </Text>
                    </View>
                    <View style={[styles.metricItem, { borderBottomColor: theme.border }]}>
                      <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Nivel Promedio</Text>
                      <Text style={[styles.metricValue, { color: theme.text }]}>{reports.averageLevel}</Text>
                    </View>
                    <View style={[styles.metricItem, { borderBottomColor: theme.border }]}>
                      <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Usuarios Registrados (30 días)</Text>
                      <Text style={[styles.metricValue, { color: theme.text }]}>{reports.recentUsersCount}</Text>
                    </View>
                    <View style={[styles.metricItem, { borderBottomWidth: 0 }]}>
                      <Text style={[styles.metricLabel, { color: theme.textSecondary }]}>Pagos Creados (30 días)</Text>
                      <Text style={[styles.metricValue, { color: theme.text }]}>{reports.recentPaymentsCount}</Text>
                    </View>
                  </Card>
                </View>

                {/* Distribución por Categoría */}
                {Object.keys(reports.paymentsByCategory).length > 0 && (
                  <Card style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }] as any}>
                    <Text style={[styles.chartTitle, { color: theme.text }]}>Pagos por Categoría</Text>
                    <View style={styles.categoryList}>
                      {Object.entries(reports.paymentsByCategory).map(([category, count]) => (
                        <View key={category} style={styles.categoryItem}>
                          <Text style={[styles.categoryLabel, { color: theme.textSecondary }]}>{category}</Text>
                          <Text style={[styles.categoryValue, { color: theme.text }]}>{count}</Text>
                        </View>
                      ))}
                    </View>
                  </Card>
                )}

                {/* Distribución por Rol */}
                {Object.keys(reports.usersByRole).length > 0 && (
                  <Card style={[styles.chartCard, { backgroundColor: theme.card, borderColor: theme.border }] as any}>
                    <Text style={[styles.chartTitle, { color: theme.text }]}>Usuarios por Rol</Text>
                    <View style={styles.categoryList}>
                      {Object.entries(reports.usersByRole).map(([role, count]) => (
                        <View key={role} style={styles.categoryItem}>
                          <Text style={[styles.categoryLabel, { color: theme.textSecondary }]}>
                            {role.toString().toLowerCase() === 'admin' ? 'Administradores' : 'Usuarios'}
                          </Text>
                          <Text style={[styles.categoryValue, { color: theme.text }]}>{count}</Text>
                        </View>
                      ))}
                    </View>
                  </Card>
                )}
              </>
            ) : (
              <Card style={[{ backgroundColor: theme.card, borderColor: theme.border }] as any}>
                <View style={styles.emptyContainer}>
                  <Ionicons name="stats-chart-outline" size={48} color={theme.textSecondary} />
                  <Text style={[styles.emptyText, { color: theme.text }]}>No hay datos para mostrar</Text>
                </View>
              </Card>
            )}
          </>
        )}

        {activeTab === 'Auditoría' && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Registro de Auditoría ({auditLogs.length})
            </Text>

            {auditLogs.length === 0 ? (
              <Card style={[{ backgroundColor: theme.card, borderColor: theme.border }] as any}>
                <View style={styles.emptyContainer}>
                  <Ionicons name="document-text-outline" size={48} color={theme.textSecondary} />
                  <Text style={[styles.emptyText, { color: theme.text }]}>No hay registros de auditoría aún</Text>
                  <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                    Los registros aparecerán aquí después de ejecutar la migración SQL de la tabla audit_logs
                  </Text>
                </View>
              </Card>
            ) : (
              auditLogs.map((log) => (
                <Card key={log.id} style={[styles.auditCard, { backgroundColor: theme.card, borderColor: theme.border }] as any}>
                  <View style={styles.auditRow}>
                    <View style={[styles.avatar, { backgroundColor: '#DC2626' }]}>
                      <Text style={styles.avatarText}>{getInitials(log.admin_name)}</Text>
                    </View>
                    <View style={styles.auditInfo}>
                      <Text style={[styles.auditAdminName, { color: theme.text }]}>{log.admin_name}</Text>
                      <View style={[
                        styles.auditBadge,
                        { backgroundColor: getActionColor(log.action_type) + '20' }
                      ]}>
                        <Ionicons 
                          name="checkmark-circle-outline" 
                          size={14} 
                          color={getActionColor(log.action_type)} 
                        />
                        <Text style={[
                          styles.auditActionText,
                          { color: getActionColor(log.action_type) }
                        ]}>
                          {getActionLabel(log.action_type)}
                        </Text>
                      </View>
                      {log.target_user_name && (
                        <Text style={[styles.auditTarget, { color: theme.textSecondary }]}>
                          Usuario: {log.target_user_name}
                        </Text>
                      )}
                      {log.details && (
                        <Text style={[styles.auditDetails, { color: theme.textSecondary }]}>
                          {JSON.stringify(log.details)}
                        </Text>
                      )}
                      <Text style={[styles.auditDate, { color: theme.textSecondary }]}>{formatDate(log.created_at)}</Text>
                    </View>
                  </View>
                </Card>
              ))
            )}
          </>
        )}

        {activeTab === 'Contraseñas' && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Cambiar Mi Contraseña</Text>
            <Card style={[styles.passwordCard, { backgroundColor: theme.card, borderColor: theme.border }] as any}>
              <View style={styles.passwordInfo}>
                <Ionicons name="lock-closed" size={48} color={theme.primary} />
                <Text style={[styles.passwordTitle, { color: theme.text }]}>Actualizar Contraseña</Text>
                <Text style={[styles.passwordSubtitle, { color: theme.textSecondary }]}>
                  Ingresa tu contraseña actual y la nueva contraseña
                </Text>
              </View>

              <View style={styles.passwordForm}>
                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Contraseña Actual</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: resolvedMode === 'dark' ? theme.border : '#F9FAFB', borderColor: theme.border, color: theme.text }]}
                    placeholder="••••••••"
                    secureTextEntry
                    value={myCurrentPassword}
                    onChangeText={setMyCurrentPassword}
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Nueva Contraseña</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: resolvedMode === 'dark' ? theme.border : '#F9FAFB', borderColor: theme.border, color: theme.text }]}
                    placeholder="••••••••"
                    secureTextEntry
                    value={myNewPassword}
                    onChangeText={setMyNewPassword}
                    placeholderTextColor={theme.textSecondary}
                  />
                  <Text style={[styles.helpText, { color: theme.textSecondary }]}>Mínimo 6 caracteres</Text>
                </View>

                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: theme.textSecondary }]}>Confirmar Nueva Contraseña</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: resolvedMode === 'dark' ? theme.border : '#F9FAFB', borderColor: theme.border, color: theme.text }]}
                    placeholder="••••••••"
                    secureTextEntry
                    value={myConfirmPassword}
                    onChangeText={setMyConfirmPassword}
                    placeholderTextColor={theme.textSecondary}
                  />
                </View>

              <TouchableOpacity 
                  style={[styles.updatePasswordButton, { backgroundColor: theme.primary }]}
                  onPress={handleChangeMyPassword}
              >
                  <Text style={styles.updatePasswordButtonText}>Actualizar Contraseña</Text>
              </TouchableOpacity>
              </View>
            </Card>
          </>
        )}
      </ScrollView>

      {/* Modal Ver Usuario */}
      <Modal
        visible={showViewModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowViewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Detalles del Usuario</Text>
              <TouchableOpacity onPress={() => setShowViewModal(false)}>
                <Ionicons name="close" size={24} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <ScrollView style={styles.modalContent}>
                <View style={styles.detailSection}>
                  <View style={[styles.avatarLarge, { backgroundColor: theme.primary }]}>
                    <Text style={styles.avatarLargeText}>{getInitials(selectedUser.name)}</Text>
                  </View>
                  <Text style={[styles.detailName, { color: theme.text }]}>{selectedUser.name}</Text>
                  <View style={[styles.roleBadgeLarge, { backgroundColor: getRoleColor(selectedUser.role) + '20' }]}>
                    <Text style={[styles.roleTextLarge, { color: getRoleColor(selectedUser.role) }]}>
                      {getRoleLabel(selectedUser.role)}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailInfo}>
                  <View style={styles.detailRow}>
                    <Ionicons name="mail-outline" size={20} color={theme.textSecondary} />
                    <View style={styles.detailTextContainer}>
                      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Email</Text>
                      <Text style={[styles.detailValue, { color: theme.text }]}>{selectedUser.email}</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="calendar-outline" size={20} color={theme.textSecondary} />
                    <View style={styles.detailTextContainer}>
                      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Fecha de Registro</Text>
                      <Text style={[styles.detailValue, { color: theme.text }]}>{formatDate(selectedUser.created_at)}</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="checkmark-circle-outline" size={20} color={selectedUser.email_verified ? '#10B981' : '#EF4444'} />
                    <View style={styles.detailTextContainer}>
                      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Estado de Verificación</Text>
                      <Text style={[styles.detailValue, { color: selectedUser.email_verified ? '#10B981' : '#EF4444' }]}>
                        {selectedUser.email_verified ? 'Verificado' : 'No Verificado'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="star-outline" size={20} color="#F59E0B" />
                    <View style={styles.detailTextContainer}>
                      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Puntos de Experiencia</Text>
                      <Text style={[styles.detailValue, { color: theme.text }]}>{selectedUser.experience_points} XP</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons name="trending-up-outline" size={20} color={theme.primary} />
                    <View style={styles.detailTextContainer}>
                      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Nivel Financiero</Text>
                      <Text style={[styles.detailValue, { color: theme.text }]}>Nivel {selectedUser.financial_level}</Text>
                    </View>
                  </View>

                  <View style={styles.detailRow}>
                    <Ionicons
                      name={isUserSuspended(selectedUser) ? 'ban-outline' : 'checkmark-circle-outline'}
                      size={20}
                      color={isUserSuspended(selectedUser) ? '#EF4444' : '#10B981'}
                    />
                    <View style={styles.detailTextContainer}>
                      <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>Estado de Cuenta</Text>
                      <Text style={[styles.detailValue, { color: isUserSuspended(selectedUser) ? '#EF4444' : '#10B981' }]}>
                        {isUserSuspended(selectedUser) ? 'Suspendido' : 'Activo'}
                      </Text>
                    </View>
                  </View>
                </View>

                 {/* Botones de Acción dentro del Modal */}
                 <View style={[styles.modalActionsContainer, { borderTopColor: theme.border }]}>
                   <Text style={[styles.modalActionsTitle, { color: theme.text }]}>Acciones</Text>
                   <View style={styles.modalActionsList}>
              <TouchableOpacity 
                       style={[styles.modalActionButton, { backgroundColor: resolvedMode === 'dark' ? theme.border : '#F9FAFB', borderColor: theme.border }]}
                       onPress={() => {
                         setShowViewModal(false);
                         handleChangePassword(selectedUser);
                       }}
              >
                       <Ionicons name="key-outline" size={20} color={theme.primary} />
                       <Text style={[styles.modalActionText, { color: theme.text }]}>Cambiar Contraseña</Text>
                       <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity 
                       style={[styles.modalActionButton, { backgroundColor: resolvedMode === 'dark' ? theme.border : '#F9FAFB', borderColor: theme.border }]}
                       onPress={() => {
                         setShowViewModal(false);
                         handleChangeRole(selectedUser);
                       }}
              >
                       <Ionicons name="person-outline" size={20} color={theme.primary} />
                       <Text style={[styles.modalActionText, { color: theme.text }]}>Cambiar Rol</Text>
                       <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity 
                       style={[styles.modalActionButton, { backgroundColor: resolvedMode === 'dark' ? theme.border : '#F9FAFB', borderColor: theme.border }]}
                       onPress={() => {
                         setShowViewModal(false);
                         handleAssignXP(selectedUser);
                       }}
                     >
                       <Ionicons name="star-outline" size={20} color={theme.primary} />
                       <Text style={[styles.modalActionText, { color: theme.text }]}>Asignar XP</Text>
                       <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              </TouchableOpacity>

              <TouchableOpacity 
                       style={[styles.modalActionButton, { backgroundColor: resolvedMode === 'dark' ? theme.border : '#F9FAFB', borderColor: theme.border }]}
                       onPress={() => {
                         setShowViewModal(false);
                         handleChangeLevel(selectedUser);
                       }}
                     >
                       <Ionicons name="trending-up-outline" size={20} color={theme.primary} />
                       <Text style={[styles.modalActionText, { color: theme.text }]}>Cambiar Nivel</Text>
                       <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                     </TouchableOpacity>

                     {isUserSuspended(selectedUser) ? (
                       <TouchableOpacity 
                         style={[
                           styles.modalActionButton,
                           styles.modalActionButtonEnable,
                           { backgroundColor: resolvedMode === 'dark' ? theme.border : '#F0FDF4', borderColor: theme.border },
                         ]}
                         onPress={() => {
                           setShowViewModal(false);
                           handleToggleSuspend(selectedUser.id, true);
                         }}
                       >
                         <Ionicons name="checkmark-circle-outline" size={20} color="#10B981" />
                         <Text style={[styles.modalActionText, { color: '#10B981' }]}>Habilitar Usuario</Text>
                         <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                       </TouchableOpacity>
                     ) : (
                       <TouchableOpacity 
                         style={[
                           styles.modalActionButton,
                           styles.modalActionButtonSuspend,
                           { backgroundColor: resolvedMode === 'dark' ? theme.border : '#FEF2F2', borderColor: theme.border },
                         ]}
                         onPress={() => {
                           setShowViewModal(false);
                           handleToggleSuspend(selectedUser.id, false);
                         }}
                       >
                         <Ionicons name="ban-outline" size={20} color="#EF4444" />
                         <Text style={[styles.modalActionText, { color: '#EF4444' }]}>Suspender Usuario</Text>
                         <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                       </TouchableOpacity>
                     )}

                     <TouchableOpacity 
                       style={[
                         styles.modalActionButton,
                         styles.modalActionButtonDelete,
                         { backgroundColor: resolvedMode === 'dark' ? theme.border : '#FEF2F2', borderColor: theme.border },
                       ]}
                       onPress={() => {
                         setShowViewModal(false);
                         handleDeleteUser(selectedUser);
                       }}
                     >
                       <Ionicons name="trash-outline" size={20} color="#EF4444" />
                       <Text style={[styles.modalActionText, { color: '#EF4444' }]}>Eliminar Usuario</Text>
                       <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
                 </View>
      </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Asignar XP */}
      <Modal
        visible={showXPModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowXPModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.inputModalContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.inputModalTitle, { color: theme.text }]}>Asignar Puntos de Experiencia</Text>
            <Text style={[styles.inputModalSubtitle, { color: theme.textSecondary }]}>
              Usuario: {selectedUser?.name}
            </Text>
            <TextInput
              style={[styles.inputModalInput, { backgroundColor: resolvedMode === 'dark' ? theme.border : '#F9FAFB', borderColor: theme.border, color: theme.text }]}
              placeholder="Cantidad de XP"
              keyboardType="numeric"
              value={xpAmount}
              onChangeText={setXpAmount}
              placeholderTextColor={theme.textSecondary}
            />
            <View style={styles.inputModalButtons}>
              <TouchableOpacity
                style={[styles.inputModalCancel, { backgroundColor: resolvedMode === 'dark' ? theme.border : '#F3F4F6' }]}
                onPress={() => {
                  setShowXPModal(false);
                  setXpAmount('');
                  setSelectedUser(null);
                }}
              >
                <Text style={[styles.inputModalCancelText, { color: theme.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.inputModalSave, { backgroundColor: theme.primary }]}
                onPress={handleSaveXP}
              >
                <Text style={styles.inputModalSaveText}>Asignar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Cambiar Contraseña */}
      <Modal
        visible={showPasswordModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowPasswordModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.inputModalContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.inputModalTitle, { color: theme.text }]}>Cambiar Contraseña</Text>
            <Text style={[styles.inputModalSubtitle, { color: theme.textSecondary }]}>
              Usuario: {selectedUser?.name}
            </Text>
            <TextInput
              style={[styles.inputModalInput, { backgroundColor: resolvedMode === 'dark' ? theme.border : '#F9FAFB', borderColor: theme.border, color: theme.text }]}
              placeholder="Nueva contraseña"
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
              placeholderTextColor={theme.textSecondary}
            />
            <TextInput
              style={[styles.inputModalInput, { backgroundColor: resolvedMode === 'dark' ? theme.border : '#F9FAFB', borderColor: theme.border, color: theme.text }]}
              placeholder="Confirmar contraseña"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholderTextColor={theme.textSecondary}
            />
            <View style={styles.inputModalButtons}>
              <TouchableOpacity
                style={[styles.inputModalCancel, { backgroundColor: resolvedMode === 'dark' ? theme.border : '#F3F4F6' }]}
                onPress={() => {
                  setShowPasswordModal(false);
                  setNewPassword('');
                  setConfirmPassword('');
                  setSelectedUser(null);
                }}
              >
                <Text style={[styles.inputModalCancelText, { color: theme.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.inputModalSave, { backgroundColor: theme.primary }]}
                onPress={handleSavePassword}
              >
                <Text style={styles.inputModalSaveText}>Actualizar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Cambiar Rol */}
      <Modal
        visible={showRoleModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowRoleModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.inputModalContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.inputModalTitle, { color: theme.text }]}>Cambiar Rol</Text>
            <Text style={[styles.inputModalSubtitle, { color: theme.textSecondary }]}>
              Usuario: {selectedUser?.name}
            </Text>
            <View style={styles.roleOptions}>
              <TouchableOpacity
                style={[
                  styles.roleOption,
                  { borderColor: theme.border, backgroundColor: resolvedMode === 'dark' ? theme.border : '#F3F4F6' },
                  selectedRole === 'user' && [styles.roleOptionActive, { backgroundColor: theme.primary }],
                ]}
                onPress={() => setSelectedRole('user')}
              >
                <Text style={[styles.roleOptionText, { color: theme.textSecondary }, selectedRole === 'user' && styles.roleOptionTextActive]}>
                  Usuario
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.roleOption,
                  { borderColor: theme.border, backgroundColor: resolvedMode === 'dark' ? theme.border : '#F3F4F6' },
                  selectedRole === 'admin' && [styles.roleOptionActive, { backgroundColor: theme.primary }],
                ]}
                onPress={() => setSelectedRole('admin')}
              >
                <Text style={[styles.roleOptionText, { color: theme.textSecondary }, selectedRole === 'admin' && styles.roleOptionTextActive]}>
                  Administrador
                </Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputModalButtons}>
              <TouchableOpacity
                style={[styles.inputModalCancel, { backgroundColor: resolvedMode === 'dark' ? theme.border : '#F3F4F6' }]}
                onPress={() => {
                  setShowRoleModal(false);
                  setSelectedUser(null);
                }}
              >
                <Text style={[styles.inputModalCancelText, { color: theme.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.inputModalSave, { backgroundColor: theme.primary }]}
                onPress={handleSaveRole}
              >
                <Text style={styles.inputModalSaveText}>Actualizar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Cambiar Nivel */}
      <Modal
        visible={showLevelModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowLevelModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.inputModalContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.inputModalTitle, { color: theme.text }]}>Cambiar Nivel Financiero</Text>
            <Text style={[styles.inputModalSubtitle, { color: theme.textSecondary }]}>
              Usuario: {selectedUser?.name}
            </Text>
            <TextInput
              style={[styles.inputModalInput, { backgroundColor: resolvedMode === 'dark' ? theme.border : '#F9FAFB', borderColor: theme.border, color: theme.text }]}
              placeholder="Nivel (ej: 1, 2, 3...)"
              keyboardType="numeric"
              value={newLevel}
              onChangeText={setNewLevel}
              placeholderTextColor={theme.textSecondary}
            />
            <View style={styles.inputModalButtons}>
              <TouchableOpacity
                style={[styles.inputModalCancel, { backgroundColor: resolvedMode === 'dark' ? theme.border : '#F3F4F6' }]}
                onPress={() => {
                  setShowLevelModal(false);
                  setNewLevel('');
                  setSelectedUser(null);
                }}
              >
                <Text style={[styles.inputModalCancelText, { color: theme.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.inputModalSave, { backgroundColor: theme.primary }]}
                onPress={handleSaveLevel}
              >
                <Text style={styles.inputModalSaveText}>Actualizar</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  statsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    minWidth: '45%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  tabsContainer: {
    marginBottom: 24,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: '#F3F4F6',
  },
  activeTab: {
    backgroundColor: '#2563EB',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  emptyCard: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCard: {
    padding: 16,
    marginBottom: 12,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 2,
  },
  userDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  userStatsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  userStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
  },
  userStatText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#374151',
  },
  actionButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    maxWidth: 200,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    color: '#374151',
    fontWeight: '500',
  },
  suspendButton: {
    backgroundColor: '#FEE2E2',
  },
  enableButton: {
    backgroundColor: '#D1FAE5',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  reportsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  reportsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  reportsSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },
  exportButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  exportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    gap: 6,
  },
  exportButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2563EB',
  },
  reportCards: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  reportCard: {
    flex: 1,
    minWidth: '45%',
    padding: 20,
    alignItems: 'center',
  },
  reportIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  reportValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  reportLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  reportSubtext: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },
  chartCard: {
    padding: 20,
    marginBottom: 24,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  barChart: {
    gap: 16,
  },
  barItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  barLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    width: 80,
  },
  barContainer: {
    flex: 1,
    height: 24,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
  },
  bar: {
    height: '100%',
    borderRadius: 12,
  },
  barValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
    width: 40,
    textAlign: 'right',
  },
  metricsContainer: {
    marginBottom: 24,
  },
  metricCard: {
    padding: 20,
  },
  metricHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  metricTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  metricItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  metricLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  auditCard: {
    padding: 16,
    marginBottom: 12,
  },
  auditRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  auditInfo: {
    flex: 1,
    marginLeft: 12,
  },
  auditAdminName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  auditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
    gap: 6,
    marginBottom: 8,
  },
  auditActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  auditTarget: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  auditDetails: {
    fontSize: 12,
    color: '#9CA3AF',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  auditDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  passwordCard: {
    padding: 24,
  },
  passwordInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  passwordTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  passwordSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  passwordForm: {
    gap: 16,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#111827',
  },
  helpText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  updatePasswordButton: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  updatePasswordButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingReportsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
  categoryList: {
    gap: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
  },
  categoryValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalContent: {
    padding: 20,
  },
  detailSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarLargeText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  detailName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  roleBadgeLarge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  roleTextLarge: {
    fontSize: 14,
    fontWeight: '600',
  },
  detailInfo: {
    gap: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailTextContainer: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  modalActionsContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    marginTop: 16,
  },
  modalActionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 12,
  },
  modalActionsList: {
    gap: 8,
  },
  modalActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    gap: 12,
  },
  modalActionText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  modalActionButtonEnable: {
    backgroundColor: '#D1FAE5',
  },
  modalActionButtonSuspend: {
    backgroundColor: '#FEE2E2',
  },
  modalActionButtonDelete: {
    backgroundColor: '#FEE2E2',
  },
  inputModalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  inputModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  inputModalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  inputModalInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#F9FAFB',
  },
  inputModalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  inputModalCancel: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  inputModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  inputModalSave: {
    flex: 1,
    backgroundColor: '#2563EB',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  inputModalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  roleOptions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  roleOption: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
  },
  roleOptionActive: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  roleOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  roleOptionTextActive: {
    color: '#2563EB',
  },
});
