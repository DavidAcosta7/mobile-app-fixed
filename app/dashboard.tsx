import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Modal, TextInput, TouchableOpacity, ActivityIndicator, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as IntentLauncher from 'expo-intent-launcher';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { StatCard } from '../components/ui/StatCard';
import { TabBar } from '../components/ui/TabBar';
import { Card } from '../components/ui/Card';
import { userService } from '../services/users.service';
import { Header } from '../components/Header';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { format } from 'date-fns';
import { achievementService, Achievement } from '../services/achievements.service';
import { useTheme } from '../contexts/ThemeContext';
import { NotificationService } from '../services/notifications.service';
import { COLOMBIAN_BANKS } from '../constants/banks';

// Helper function to map emojis or icon names to valid Ionicons names
const getIconName = (icon: string | null | undefined): keyof typeof Ionicons.glyphMap => {
  if (!icon) return 'card';
  
  // Map emojis to Ionicons
  const emojiMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    '\u{1F4B3}': 'card',
    '\u{1F919}': 'call',
    '\u{1F4F1}': 'phone-portrait',
    '\u{1F4A1}': 'bulb',
    '\u{1F3B5}': 'musical-notes',
    '\u{1F3E0}': 'home',
    '\u{1F697}': 'car',
    '\u{1F354}': 'restaurant',
    '\u26A1': 'flash',
    '\u{1F4B0}': 'cash',
    '\u{1F6D2}': 'cart',
    '\u{1F3E5}': 'medical',
    '\u{1F3AE}': 'game-controller',
    '\u{1F455}': 'shirt',
    '\u{1F393}': 'school',
    '\u2708\uFE0F': 'airplane',
    '\u{1F3CB}\uFE0F': 'barbell',
    '\u{1F3AC}': 'film',
    '\u{1F4DA}': 'library',
    '\u{1F3A8}': 'color-palette',
  };
  
  // If it's an emoji, map it
  if (emojiMap[icon]) {
    return emojiMap[icon];
  }
  
  // If it's already a valid icon name (or close to one), try to use it
  // Otherwise, default to 'card'
  const validIconNames = ['card', 'cash', 'time', 'alert-circle', 'home', 'trophy', 'settings'];
  if (validIconNames.includes(icon.toLowerCase())) {
    return icon.toLowerCase() as keyof typeof Ionicons.glyphMap;
  }
  
  // Default fallback
  return 'card';
};

export default function DashboardScreen() {
  const { user, refreshUser } = useAuth();
  const router = useRouter();
  const { theme: colors, resolvedMode } = useTheme();
  const [activeTab, setActiveTab] = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loadingAchievements, setLoadingAchievements] = useState(false);

  // Form states
  const [paymentName, setPaymentName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('COP');
  const [dueDateDate, setDueDateDate] = useState<Date | null>(null);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [category, setCategory] = useState('');
  const [editingPayment, setEditingPayment] = useState<any>(null);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [deepLink, setDeepLink] = useState('');
  const [selectedAppName, setSelectedAppName] = useState('');

  const [promptVisible, setPromptVisible] = useState(false);
  const [promptTitle, setPromptTitle] = useState('');
  const [promptMessage, setPromptMessage] = useState('');
  const [promptValue, setPromptValue] = useState('');
  const [promptOnSave, setPromptOnSave] = useState<((value: string) => void) | null>(null);

  const toLocalNoonIso = (d: Date) => {
    const localNoon = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
    return localNoon.toISOString();
  };

  const promptText = (
    title: string,
    message: string,
    initialValue: string,
    onSave: (value: string) => void
  ) => {
    if (Platform.OS === 'ios' && typeof (Alert as any).prompt === 'function') {
      (Alert as any).prompt(
        title,
        message,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Guardar',
            onPress: (value?: string) => {
              if (value) onSave(value);
            },
          },
        ],
        'plain-text',
        initialValue
      );
      return;
    }

    setPromptTitle(title);
    setPromptMessage(message);
    setPromptValue(initialValue);
    setPromptOnSave(() => onSave);
    setPromptVisible(true);
  };

  const loadPayments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('user_id', user?.id)
        .order('due_date', { ascending: true });

      if (error) throw error;
      setPayments(data || []);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAchievements = async () => {
    try {
      if (!user?.id) return;
      setLoadingAchievements(true);

      const list = await achievementService.findByUserId(user.id);
      if (list.length === 0) {
        await achievementService.initializeDefaultAchievements(user.id);
      }

      const refreshed = await achievementService.findByUserId(user.id);
      setAchievements(refreshed);
    } catch (e) {
      console.error('Error loading achievements:', e);
    } finally {
      setLoadingAchievements(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadPayments();
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      void loadAchievements();

      const channel = supabase
        .channel(`achievements-dashboard-${user.id}`)
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
    }
    return;
  }, [user?.id]);

  // Verificar si es primer login y no tiene pagos
  useEffect(() => {
    if (user?.first_login && payments.length === 0 && !loading) {
      setIsFirstLogin(true);
      setShowModal(true);
    }
  }, [user?.first_login, payments.length, loading]);

  const handleSavePayment = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'No se pudo identificar al usuario');
      return;
    }

    // Validaciones
    if (!paymentName || !amount || !dueDateDate || !category) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    try {
      setLoading(true);

      const parsedDateIso = toLocalNoonIso(dueDateDate);

      const preferences = await NotificationService.getPreferences(user.id);
      if (preferences.notifications_enabled) {
        await NotificationService.requestPermissions();
      }

      if (editingPayment) {
        // Actualizar pago existente
        const { data: updatedPayment, error } = await supabase
          .from('payments')
          .update({
            name: paymentName,
            amount: parseFloat(amount),
            currency: currency,
            category: category,
            due_date: parsedDateIso,
            selected_date: parsedDateIso,
            icon: 'card',
            payment_url: deepLink ? null : paymentUrl,
            deep_link: paymentUrl ? '' : deepLink,
            app_name: selectedAppName || null,
          })
          .eq('id', editingPayment.id)
          .select()
          .single();

        if (error) throw error;

        if (preferences.notifications_enabled) {
          await NotificationService.schedulePaymentNotifications(
            updatedPayment ?? editingPayment,
            user.id,
            preferences
          );
        } else {
          await NotificationService.cancelPaymentNotifications(editingPayment.id);
        }
        Alert.alert('Éxito', 'Pago actualizado correctamente');
      } else {
        // Crear nuevo pago
        const { data: insertedPayment, error } = await supabase
          .from('payments')
          .insert({
            user_id: user.id,
            name: paymentName,
            amount: parseFloat(amount),
            currency: currency,
            category: category,
            due_date: parsedDateIso,
            selected_date: parsedDateIso,
            status: 'PENDING',
            icon: 'card',
            description: '',
            auto_debit: false,
            payment_url: deepLink ? null : paymentUrl,
            deep_link: paymentUrl ? '' : deepLink,
            app_name: selectedAppName || null,
          })
          .select()
          .single();

        if (error) throw error;

        if (insertedPayment && preferences.notifications_enabled) {
          await NotificationService.schedulePaymentNotifications(insertedPayment, user.id, preferences);
        }
        
        // Si es el primer pago y es primer login, actualizar first_login y redirigir
        if (isFirstLogin && !editingPayment) {
          // Actualizar first_login a false
          await userService.update(user.id, { first_login: false });
          // Refrescar el usuario para obtener los datos actualizados
          await refreshUser();
          
          // Cerrar modal y resetear estados
          setShowModal(false);
          setIsFirstLogin(false);
          setPaymentName('');
          setAmount('');
          setDueDateDate(null);
          setCategory('');
          setPaymentUrl('');
          setDeepLink('');
          setSelectedAppName('');
          
          Alert.alert(
            '¡Excelente!',
            'Tu primer pago ha sido registrado. Ahora configura tus notificaciones para recibir recordatorios.',
            [
              {
                text: 'Configurar Notificaciones',
                onPress: () => {
                  // Navegar a notificaciones
                  router.push('/notification-settings');
                },
              },
            ]
          );
        } else {
          Alert.alert('Éxito', 'Pago agregado correctamente');
          // Resetear form solo si no es primer login
          setShowModal(false);
        }
      }

      // Resetear form
      if (!isFirstLogin) {
        setShowModal(false);
      }
      setPaymentName('');
      setAmount('');
      setDueDateDate(null);
      setCategory('');
      setPaymentUrl('');
      setDeepLink('');
      setSelectedAppName('');
      setEditingPayment(null);
      
      // Recargar pagos y reprogramar notificaciones
      await loadPayments();

      try {
        const refreshedPreferences = await NotificationService.getPreferences(user.id);
        if (refreshedPreferences.notifications_enabled) {
          await NotificationService.requestPermissions();
        }
        await NotificationService.rescheduleAllUserPayments(user.id, refreshedPreferences);
      } catch (e) {
        console.error('Error rescheduling notifications after saving payment:', e);
      }
    } catch (error) {
      console.error('Error saving payment:', error);
      Alert.alert('Error', 'No se pudo guardar el pago');
    } finally {
      setLoading(false);
    }
  };

  const handleEditPayment = (payment: any) => {
    setEditingPayment(payment);
    setPaymentName(payment.name);
    setAmount(payment.amount.toString());
    setDueDateDate(new Date(payment.due_date));
    setCategory(payment.category);
    setPaymentUrl(payment.payment_url || '');
    setDeepLink(payment.deep_link || '');
    setSelectedAppName(payment.app_name || '');
    setShowModal(true);
  };

  const handlePayment = async (payment: any) => {
    try {
      // Si tiene app configurada
      if (payment.deep_link) {
        const packageName = payment.deep_link;

        try {
          await IntentLauncher.openApplication(packageName);
          return;
        } catch (error) {
          // Si falla, intentar con Linking
          try {
            const canOpen = await Linking.canOpenURL(`package:${packageName}`);
            if (canOpen) {
              await Linking.openURL(`package:${packageName}`);
              return;
            }
          } catch (e) {
            console.error('Linking error:', e);
          }

          // App no instalada
          Alert.alert(
            'App no instalada',
            `La aplicación ${payment.app_name || 'bancaria'} no está instalada en tu teléfono.`,
            [
              { text: 'OK', style: 'cancel' },
              payment.payment_url
                ? {
                    text: 'Abrir URL web',
                    onPress: () => Linking.openURL(payment.payment_url),
                  }
                : null,
            ].filter(Boolean) as any
          );
          return;
        }
      }
      // Si tiene URL web
      else if (payment.payment_url) {
        const canOpen = await Linking.canOpenURL(payment.payment_url);
        if (canOpen) {
          await Linking.openURL(payment.payment_url);
        } else {
          Alert.alert('Error', 'No se puede abrir el link');
        }
        return;
      }

      // Sin configurar
      Alert.alert('Sin configurar', 'Edita este pago para configurar un método de pago');
    } catch (error) {
      console.error('Payment error:', error);
      Alert.alert('Error', 'No se pudo abrir el método de pago');
    }
  };

  const handleDeletePayment = async (payment: any) => {
    Alert.alert(
      'Eliminar pago',
      `¿Eliminar "${payment.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await NotificationService.cancelPaymentNotifications(payment.id);

              const { error } = await supabase.from('payments').delete().eq('id', payment.id);
              if (error) throw error;

              await loadPayments();
            } catch (e) {
              console.error('Error deleting payment:', e);
              Alert.alert('Error', 'No se pudo eliminar el pago');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const filteredPayments = payments.filter((payment) => {
    if (activeTab === 'Todos') return true;
    if (activeTab === 'Pendientes') return payment.status === 'PENDING';
    if (activeTab === 'Urgentes') return payment.status === 'URGENT';
    if (activeTab === 'Pagados') return payment.status === 'COMPLETED';
    return true;
  });

  const stats = [
    { label: 'Total Pagos', value: payments.length.toString(), icon: 'card', color: 'blue' as const },
    { label: 'Pendientes', value: payments.filter(p => p.status === 'PENDING').length.toString(), icon: 'time', color: 'orange' as const },
    { label: 'Urgentes', value: payments.filter(p => p.status === 'URGENT').length.toString(), icon: 'alert-circle', color: 'red' as const },
    { label: 'Total Mensual', value: `$${payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0).toFixed(2)}`, icon: 'cash', color: 'green' as const },
  ];

  const totalAchievements = achievements.length;
  const unlockedAchievements = achievements.filter(a => a.unlocked).length;
  const previewAchievements = achievements.slice(0, 4);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }] }>
      <Header />

      <Modal
        visible={promptVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPromptVisible(false)}
      >
        <View style={styles.promptOverlay}>
          <View style={[styles.promptContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.promptTitle, { color: colors.text }]}>{promptTitle}</Text>
            <Text style={[styles.promptMessage, { color: colors.textSecondary }]}>{promptMessage}</Text>
            <TextInput
              style={[styles.promptInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
              value={promptValue}
              onChangeText={setPromptValue}
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
            />
            <View style={styles.promptButtons}>
              <TouchableOpacity
                style={[styles.promptCancelButton, { backgroundColor: resolvedMode === 'dark' ? colors.border : colors.card, borderColor: colors.border }]}
                onPress={() => {
                  setPromptVisible(false);
                  setPromptOnSave(null);
                }}
              >
                <Text style={[styles.promptCancelText, { color: colors.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.promptSaveButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  const value = (promptValue || '').trim();
                  if (value && promptOnSave) {
                    promptOnSave(value);
                  }
                  setPromptVisible(false);
                  setPromptOnSave(null);
                }}
              >
                <Text style={styles.promptSaveText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>FLUXPAY</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Bienvenido, {user?.name || 'Administrador'}
          </Text>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          {stats.map((stat, index) => (
            <StatCard
              key={index}
              label={stat.label}
              value={stat.value}
              icon={stat.icon}
              color={stat.color}
            />
          ))}
        </View>

        {/* Mis Pagos Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Mis Pagos</Text>
            <TouchableOpacity 
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowModal(true)}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={20} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Agregar</Text>
            </TouchableOpacity>
          </View>

          <TabBar
            tabs={['Todos', 'Pendientes', 'Urgentes', 'Pagados']}
            activeTab={activeTab}
            onTabPress={setActiveTab}
          />

          {/* Lista de Pagos */}
          {loading && payments.length === 0 ? (
            <Card>
              <ActivityIndicator size="large" color={colors.primary} style={{ paddingVertical: 24 }} />
            </Card>
          ) : filteredPayments.length === 0 ? (
            <Card>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Agrega tu primer pago para comenzar
              </Text>
            </Card>
          ) : (
            <View>
              {filteredPayments.map((payment) => (
                <Card key={payment.id} style={styles.paymentCard}>
                  <View style={styles.paymentHeader}>
                    <Ionicons 
                      name={getIconName(payment.icon)} 
                      size={24} 
                      color={colors.primary} 
                      style={styles.paymentIcon}
                    />
                    <View style={styles.paymentInfo}>
                      <Text style={[styles.paymentName, { color: colors.text }]}>{payment.name}</Text>
                      <Text style={[styles.paymentCategory, { color: colors.textSecondary }]}>{payment.category}</Text>
                    </View>
                    <Text style={[styles.paymentAmount, { color: colors.text }]}>
                      ${payment.amount.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.paymentFooter}>
                    <Text style={[styles.paymentDate, { color: colors.textSecondary }]}>
                      Vence: {new Date(payment.due_date).toLocaleDateString()}
                    </Text>
                    <View style={styles.paymentActions}>
                      <TouchableOpacity 
                        style={[styles.paymentActionButton, { borderColor: colors.border, backgroundColor: colors.card }]}
                        onPress={() => handleEditPayment(payment)}
                      >
                        <Ionicons name="create-outline" size={18} color={colors.primary} style={{ marginRight: 4 }} />
                        <Text style={[styles.paymentActionText, { color: colors.primary }]}>Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.paymentActionButton, styles.deleteButton, { borderColor: colors.border, backgroundColor: colors.card }]}
                        onPress={() => handleDeletePayment(payment)}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={[styles.payButton, { backgroundColor: colors.primary }]}
                    onPress={() => handlePayment(payment)}
                  >
                    <Ionicons name="card-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.payButtonText}>Pagar</Text>
                  </TouchableOpacity>
                </Card>
              ))}
            </View>
          )}
        </View>

        {/* Progreso Mensual */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Progreso Mensual</Text>
          <Card>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressText, { color: colors.textSecondary }]}>0 de 0 pagos completados</Text>
              <Text style={[styles.progressPercent, { color: colors.primary }]}>0%</Text>
            </View>
            <View style={[styles.progressBarContainer, { backgroundColor: colors.border }]}>
              <View style={[styles.progressBar, { width: '0%', backgroundColor: colors.primary }]} />
            </View>
          </Card>
        </View>

        {/* Tus Logros */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}> Tus Logros</Text>
            <Text style={[styles.achievementCount, { color: colors.textSecondary }]}>
              {unlockedAchievements}/{totalAchievements}
            </Text>
          </View>
          <View style={styles.achievementGrid}>
            {loadingAchievements ? (
              <Card style={styles.achievementCard}>
                <ActivityIndicator color={colors.primary} />
              </Card>
            ) : previewAchievements.length === 0 ? (
              <Card style={styles.achievementCard}>
                <Ionicons name="trophy-outline" size={24} color={colors.textSecondary} />
                <Text style={[styles.achievementLabel, { color: colors.textSecondary }]}>Sin logros</Text>
              </Card>
            ) : (
              previewAchievements.map((a) => (
                <Card key={a.id} style={styles.achievementCard}>
                  <Ionicons
                    name={a.unlocked ? 'trophy-outline' : 'lock-closed-outline'}
                    size={24}
                    color={a.unlocked ? '#10B981' : '#9CA3AF'}
                  />
                  <Text style={[styles.achievementLabel, { color: colors.textSecondary }]} numberOfLines={2}>
                    {a.title}
                  </Text>
                </Card>
              ))
            )}
          </View>
          <TouchableOpacity
            style={[styles.payButton, { backgroundColor: colors.primary }]}
            onPress={() => router.push('/achievements')}
          >
            <Text style={styles.payButtonText}>Ver todos</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Modal Agregar Pago */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={isFirstLogin ? undefined : () => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.card }]}>
            {/* Header del Modal */}
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {isFirstLogin 
                  ? '¡Bienvenido a FluxPay!' 
                  : editingPayment 
                    ? 'Editar Pago' 
                    : 'Agregar Nuevo Pago'}
              </Text>
              {!isFirstLogin && (
                <TouchableOpacity onPress={() => {
                  setShowModal(false);
                  setEditingPayment(null);
                  setPaymentName('');
                  setAmount('');
                  setDueDateDate(null);
                  setCategory('');
                  setPaymentUrl('');
                  setDeepLink('');
                  setSelectedAppName('');
                }}>
                  <Ionicons name="close" size={22} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            <ScrollView style={styles.modalContent}>
              {isFirstLogin ? (
                <View style={styles.welcomeContainer}>
                  <Text style={[styles.welcomeText, { color: colors.textSecondary }] }>
                    Para comenzar, registra tu primer pago. Te ayudaremos a gestionar todos tus pagos y recibirás recordatorios para que nunca olvides realizar tus pagos a tiempo.
                  </Text>
                </View>
              ) : (
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Completa la información del pago mensual
                </Text>
              )}

              {/* Nombre del pago */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                Nombre del pago <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
                placeholder="ej: Netflix, Luz, Internet"
                value={paymentName}
                onChangeText={setPaymentName}
                placeholderTextColor={colors.textSecondary}
              />

              {/* Monto */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                Monto <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.amountRow}>
                <TextInput
                  style={[styles.input, styles.amountInput, { borderColor: colors.border, backgroundColor: colors.card, color: colors.text }]}
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                  placeholderTextColor={colors.textSecondary}
                />
                <TouchableOpacity 
                  style={[styles.currencyContainer, { borderColor: colors.border, backgroundColor: colors.card }]}
                  onPress={() => {
                    setCurrency(currency === 'COP' ? 'USD' : currency === 'USD' ? 'EUR' : 'COP');
                  }}
                >
                  <Text style={[styles.currencyText, { color: colors.text }]}>$ {currency}</Text>
                </TouchableOpacity>
              </View>

              {/* Fecha de vencimiento */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                Fecha de vencimiento <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={[styles.input, { borderColor: colors.border, backgroundColor: colors.card }]}
                onPress={() => setShowDueDatePicker(true)}
                activeOpacity={0.8}
              >
                <Text style={[styles.dateInputText, { color: colors.text }]}>
                  {dueDateDate ? format(dueDateDate, 'dd/MM/yyyy') : 'Selecciona una fecha'}
                </Text>
              </TouchableOpacity>

              {showDueDatePicker && (
                <DateTimePicker
                  value={dueDateDate ?? new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={(_event: unknown, selected?: Date) => {
                    if (Platform.OS !== 'ios') setShowDueDatePicker(false);
                    if (selected) {
                      const localDay = new Date(selected.getFullYear(), selected.getMonth(), selected.getDate(), 12, 0, 0, 0);
                      setDueDateDate(localDay);
                    }
                  }}
                />
              )}
              <View style={styles.inputHintRow}>
                <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
                <Text style={[styles.inputHint, { color: colors.textSecondary }]}>
                  La fecha se ajustará automáticamente al último día del mes
                </Text>
              </View>

              {/* Categoría */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                Categoría <Text style={styles.required}>*</Text>
              </Text>
              <View style={[styles.pickerContainer, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Picker
                  selectedValue={category}
                  onValueChange={(v: string) => setCategory(v)}
                >
                  <Picker.Item label="Selecciona una categoría" value="" />
                  <Picker.Item label="Servicios" value="SERVICIOS" />
                  <Picker.Item label="Entretenimiento" value="ENTRETENIMIENTO" />
                  <Picker.Item label="Transporte" value="TRANSPORTE" />
                  <Picker.Item label="Salud" value="SALUD" />
                  <Picker.Item label="Alimentación" value="ALIMENTACION" />
                  <Picker.Item label="Otros" value="OTROS" />
                </Picker>
              </View>

              {/* Configurar Método de Pago */}
              <View style={styles.sectionHeaderRow}>
                <Ionicons name="card-outline" size={18} color={colors.text} />
                <Text style={[styles.sectionHeaderText, { color: colors.text }]}>Método de pago</Text>
              </View>

              {/* Opción 1: Link Web */}
              <TouchableOpacity 
                style={[styles.paymentMethodButton, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => {
                  promptText(
                    'Link de Pago Web',
                    'Ingresa la URL de la página de pago',
                    paymentUrl,
                    (url) => {
                      setPaymentUrl(url);
                      setDeepLink('');
                    }
                  );
                }}
              >
                <Ionicons name="globe-outline" size={28} color={colors.text} style={styles.paymentMethodIcon} />
                <View style={styles.paymentMethodInfo}>
                  <Text style={[styles.paymentMethodTitle, { color: colors.text }]}>Link Web (URL)</Text>
                  <Text style={[styles.paymentMethodDesc, { color: colors.textSecondary }]}>
                    {paymentUrl || 'No configurado'}
                  </Text>
                </View>
                {paymentUrl && (
                  <TouchableOpacity onPress={() => setPaymentUrl('')}>
                    <Ionicons name="close-circle" size={24} color="#EF4444" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              {/* Selector de App Bancaria */}
              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 16 }]}>Aplicación bancaria para pagar</Text>

              <TouchableOpacity
                style={[
                  styles.bankSelector,
                  {
                    backgroundColor: colors.card,
                    borderColor: deepLink ? colors.primary : colors.border,
                    borderWidth: 2,
                  },
                ]}
                onPress={() => {
                  Alert.alert(
                    'Seleccionar App Bancaria',
                    'Elige la aplicación que se abrirá al presionar "Pagar"',
                    [
                      ...COLOMBIAN_BANKS.map((bank) => ({
                        text: bank.name,
                        onPress: () => {
                          setDeepLink(bank.packageName);
                          setSelectedAppName(bank.name);
                          setPaymentUrl('');
                        },
                      })),
                      {
                        text: 'Package personalizado',
                        onPress: () => {
                          promptText(
                            'Package Name',
                            'Ingresa el package name (ej: com.banco.app)',
                            deepLink,
                            (text) => {
                              const value = (text || '').trim();
                              if (value && value.includes('.')) {
                                setDeepLink(value);
                                setSelectedAppName(value);
                                setPaymentUrl('');
                              } else {
                                Alert.alert('Error', 'Package name inválido');
                              }
                            }
                          );
                        },
                      },
                      { text: 'Cancelar', style: 'cancel' },
                    ]
                  );
                }}
              >
                <View style={styles.bankSelectorContent}>
                  <Ionicons
                    name="phone-portrait"
                    size={24}
                    color={deepLink ? colors.primary : colors.textSecondary}
                  />
                  <View style={styles.bankSelectorText}>
                    <Text style={[styles.bankSelectorName, { color: colors.text }]}>
                      {selectedAppName || 'Seleccionar app bancaria'}
                    </Text>
                    {deepLink ? (
                      <Text
                        style={[styles.bankSelectorPackage, { color: colors.textSecondary }]}
                        numberOfLines={1}
                      >
                        {deepLink}
                      </Text>
                    ) : null}
                  </View>
                  {deepLink ? (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        setDeepLink('');
                        setSelectedAppName('');
                      }}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close-circle" size={24} color="#EF4444" />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="chevron-down" size={24} color={colors.textSecondary} />
                  )}
                </View>
              </TouchableOpacity>

              <View style={styles.bankHintRow}>
                <Ionicons name="bulb-outline" size={16} color={colors.textSecondary} />
                <Text style={[styles.inputHint, { color: colors.textSecondary }]}>
                  La app seleccionada se abrirá al presionar "Pagar"
                </Text>
              </View>

              {/* Botones */}
              <View style={styles.modalButtons}>
                {!isFirstLogin && (
                  <TouchableOpacity
                    style={[styles.cancelButton, { backgroundColor: resolvedMode === 'dark' ? colors.border : colors.card, borderColor: colors.border }]}
                    onPress={() => {
                      setShowModal(false);
                      setEditingPayment(null);
                      setPaymentName('');
                      setAmount('');
                      setDueDateDate(null);
                      setCategory('');
                      setPaymentUrl('');
                      setDeepLink('');
                      setSelectedAppName('');
                    }}
                  >
                    <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>Cancelar</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.saveButton, 
                    loading && styles.saveButtonDisabled,
                    isFirstLogin && styles.saveButtonFullWidth
                    , { backgroundColor: colors.primary }
                  ]}
                  onPress={handleSavePayment}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>
                      {isFirstLogin ? 'Registrar mi primer pago' : editingPayment ? 'Actualizar' : 'Guardar'}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  addButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    paddingVertical: 24,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  progressText: {
    fontSize: 14,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
  },
  achievementCount: {
    fontSize: 14,
  },
  achievementGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  achievementCard: {
    width: '23%',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
  },
  achievementIcon: {
    fontSize: 32,
    marginBottom: 4,
  },
  achievementLabel: {
    fontSize: 10,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  modalClose: {
    fontSize: 28,
    fontWeight: '300',
  },
  modalContent: {
    padding: 20,
  },
  modalSubtitle: {
    fontSize: 14,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  dateInputText: {
    fontSize: 16,
  },
  pickerContainer: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  placeholder: {
  },
  amountRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  amountInput: {
    flex: 1,
    marginBottom: 0,
  },
  currencyContainer: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    justifyContent: 'center',
    minWidth: 100,
  },
  currencyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  inputHint: {
    fontSize: 13,
    marginBottom: 16,
  },
  bankSelector: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  bankSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bankSelectorText: {
    flex: 1,
  },
  bankSelectorName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  bankSelectorPackage: {
    fontSize: 12,
  },
  bankHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonFullWidth: {
    flex: 1,
    marginLeft: 0,
  },
  welcomeContainer: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
  },
  welcomeText: {
    fontSize: 15,
    lineHeight: 22,
  },
  paymentCard: {
    marginBottom: 12,
    padding: 16,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentIcon: {
    marginRight: 12,
  },
  paymentInfo: {
    flex: 1,
  },
  paymentName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  paymentCategory: {
    fontSize: 12,
    textTransform: 'uppercase',
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  paymentMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  paymentMethodIcon: {
    marginRight: 12,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  paymentMethodDesc: {
    fontSize: 13,
  },
  clearIcon: {
    fontSize: 24,
    color: '#EF4444',
    paddingLeft: 12,
  },
  paymentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
  },
  paymentDate: {
    fontSize: 12,
  },
  paymentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentActionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
  paymentActionText: {
    fontSize: 12,
    color: '#374151',
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  categoryButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  categoryButtonActive: {
    backgroundColor: '#EFF6FF',
    borderColor: '#2563EB',
  },
  categoryButtonText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  categoryButtonTextActive: {
    color: '#2563EB',
    fontWeight: '600',
  },
  payButton: {
    backgroundColor: '#10B981',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  inputHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 20,
    marginBottom: 4,
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  bankModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  bankModalSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 24,
  },
  bankModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  bankModalSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  bankAppList: {
    gap: 10,
  },
  bankAppItem: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bankAppName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  bankEmptyState: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  bankEmptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  bankEmptySubtitle: {
    fontSize: 13,
    color: '#6B7280',
  },
  bankModalCancel: {
    marginTop: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  bankModalCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  promptOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  promptContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
  },
  promptTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  promptMessage: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  promptInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 12,
    color: '#111827',
    backgroundColor: '#F9FAFB',
    marginBottom: 12,
  },
  promptButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  promptCancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  promptCancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  promptSaveButton: {
    flex: 1,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  promptSaveText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
