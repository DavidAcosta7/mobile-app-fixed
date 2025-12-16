import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Modal, TextInput, TouchableOpacity, ActivityIndicator, Linking, Platform } from 'react-native';
import * as IntentLauncher from 'expo-intent-launcher';
import { Ionicons } from '@expo/vector-icons';
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
import { pushNotificationsService } from '../services/pushNotifications.service';

// Helper function to map emojis or icon names to valid Ionicons names
const getIconName = (icon: string | null | undefined): keyof typeof Ionicons.glyphMap => {
  if (!icon) return 'card';
  
  // Map emojis to Ionicons
  const emojiMap: Record<string, keyof typeof Ionicons.glyphMap> = {
    '💳': 'card',
    '🤙': 'call',
    '📱': 'phone-portrait',
    '💡': 'bulb',
    '🎵': 'musical-notes',
    '🏠': 'home',
    '🚗': 'car',
    '🍔': 'restaurant',
    '⚡': 'flash',
    '💰': 'cash',
    '🛒': 'cart',
    '🏥': 'medical',
    '🎮': 'game-controller',
    '👕': 'shirt',
    '🎓': 'school',
    '✈️': 'airplane',
    '🏋️': 'barbell',
    '🎬': 'film',
    '📚': 'library',
    '🎨': 'color-palette',
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
  const { theme } = useTheme();
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

      const preferences = await pushNotificationsService.getOrCreateSettings(user.id);
      if (preferences.enabled) {
        await pushNotificationsService.requestPermissions();
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
          })
          .eq('id', editingPayment.id)
          .select()
          .single();

        if (error) throw error;

        if (preferences.enabled) {
          await pushNotificationsService.schedulePaymentNotifications(
            updatedPayment ?? editingPayment,
            preferences
          );
        } else {
          await pushNotificationsService.cancelPaymentNotifications(editingPayment.id);
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
          })
          .select()
          .single();

        if (error) throw error;

        if (insertedPayment && preferences.enabled) {
          await pushNotificationsService.schedulePaymentNotifications(insertedPayment, preferences);
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
      setEditingPayment(null);
      
      // Recargar pagos y reprogramar notificaciones
      await loadPayments();

      try {
        const refreshedPreferences = await pushNotificationsService.getOrCreateSettings(user.id);
        if (refreshedPreferences.enabled) {
          await pushNotificationsService.requestPermissions();
        }
        await pushNotificationsService.rescheduleAllUserPayments(user.id, refreshedPreferences);
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
    setCurrency(payment.currency);
    setCategory(payment.category);
    setPaymentUrl(payment.payment_url || '');
    setDeepLink(payment.deep_link || '');
    const date = new Date(payment.due_date);
    const localDay = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
    setDueDateDate(localDay);
    setShowModal(true);
  };

  const handleDeletePayment = (payment: any) => {
    Alert.alert(
      'Eliminar Pago',
      `¿Estás seguro que deseas eliminar "${payment.name}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('payments')
                .delete()
                .eq('id', payment.id);

              if (error) throw error;

              await pushNotificationsService.cancelPaymentNotifications(payment.id);

              Alert.alert('Éxito', 'Pago eliminado');
              loadPayments();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el pago');
            }
          }
        }
      ]
    );
  };

  const handlePayment = async (payment: any) => {
    try {
      // Si tiene app configurada (packageName)
      if (payment.deep_link) {
        const packageName = payment.deep_link;

        if (Platform.OS === 'android') {
          try {
            await IntentLauncher.openApplication(packageName);
            return;
          } catch {
            Alert.alert(
              'App no instalada',
              'La aplicación no está instalada en tu teléfono. ¿Deseas usar el link web?',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Abrir Web',
                  onPress: () => {
                    if (payment.payment_url) {
                      void Linking.openURL(payment.payment_url);
                    } else {
                      Alert.alert('Error', 'No hay link web configurado');
                    }
                  },
                },
              ]
            );
            return;
          }
        }

        // iOS: intentamos abrir como URL (si el usuario configuró un scheme).
        try {
          await Linking.openURL(packageName);
          return;
        } catch {
          // fallthrough
        }
      }

      // Si tiene URL web
      if (payment.payment_url) {
        const canOpen = await Linking.canOpenURL(payment.payment_url);
        if (canOpen) {
          await Linking.openURL(payment.payment_url);
        } else {
          Alert.alert('Error', 'No se puede abrir el link');
        }
        return;
      }

      Alert.alert(
        'Sin configurar',
        'Edita este pago para configurar un método de pago (app o link web)'
      );
    } catch (error) {
      Alert.alert('Error', 'No se pudo abrir el método de pago');
      console.error('Error opening payment:', error);
    }
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
    <View style={[styles.container, { backgroundColor: theme.background }] }>
      <Header />

      <Modal
        visible={promptVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPromptVisible(false)}
      >
        <View style={styles.promptOverlay}>
          <View style={styles.promptContainer}>
            <Text style={styles.promptTitle}>{promptTitle}</Text>
            <Text style={styles.promptMessage}>{promptMessage}</Text>
            <TextInput
              style={styles.promptInput}
              value={promptValue}
              onChangeText={setPromptValue}
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
            />
            <View style={styles.promptButtons}>
              <TouchableOpacity
                style={styles.promptCancelButton}
                onPress={() => {
                  setPromptVisible(false);
                  setPromptOnSave(null);
                }}
              >
                <Text style={styles.promptCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.promptSaveButton}
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
          <Text style={[styles.title, { color: theme.text }]}>FLUXPAY</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
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
            <Text style={styles.sectionTitle}>Mis Pagos</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.addButtonText}>+ Agregar</Text>
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
              <ActivityIndicator size="large" color="#2563EB" style={{ paddingVertical: 24 }} />
            </Card>
          ) : filteredPayments.length === 0 ? (
            <Card>
              <Text style={styles.emptyText}>
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
                      color="#2563EB" 
                      style={styles.paymentIcon}
                    />
                    <View style={styles.paymentInfo}>
                      <Text style={styles.paymentName}>{payment.name}</Text>
                      <Text style={styles.paymentCategory}>{payment.category}</Text>
                    </View>
                    <Text style={styles.paymentAmount}>
                      ${payment.amount.toFixed(2)}
                    </Text>
                  </View>
                  <View style={styles.paymentFooter}>
                    <Text style={styles.paymentDate}>
                      Vence: {new Date(payment.due_date).toLocaleDateString()}
                    </Text>
                    <View style={styles.paymentActions}>
                      <TouchableOpacity 
                        style={styles.paymentActionButton}
                        onPress={() => handleEditPayment(payment)}
                      >
                        <Ionicons name="create-outline" size={18} color="#2563EB" style={{ marginRight: 4 }} />
                        <Text style={styles.paymentActionText}>Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.paymentActionButton, styles.deleteButton]}
                        onPress={() => handleDeletePayment(payment)}
                      >
                        <Ionicons name="trash-outline" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.payButton}
                    onPress={() => handlePayment(payment)}
                  >
                    <Text style={styles.payButtonText}> Pagar</Text>
                  </TouchableOpacity>
                </Card>
              ))}
            </View>
          )}
        </View>

        {/* Progreso Mensual */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Progreso Mensual</Text>
          <Card>
            <View style={styles.progressHeader}>
              <Text style={styles.progressText}>0 de 0 pagos completados</Text>
              <Text style={styles.progressPercent}>0%</Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View style={[styles.progressBar, { width: '0%' }]} />
            </View>
          </Card>
        </View>

        {/* Tus Logros */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}> Tus Logros</Text>
            <Text style={styles.achievementCount}>
              {unlockedAchievements}/{totalAchievements}
            </Text>
          </View>
          <View style={styles.achievementGrid}>
            {loadingAchievements ? (
              <Card style={styles.achievementCard}>
                <ActivityIndicator color="#2563EB" />
              </Card>
            ) : previewAchievements.length === 0 ? (
              <Card style={styles.achievementCard}>
                <Ionicons name="trophy-outline" size={24} color="#9CA3AF" />
                <Text style={styles.achievementLabel}>Sin logros</Text>
              </Card>
            ) : (
              previewAchievements.map((a) => (
                <Card key={a.id} style={styles.achievementCard}>
                  <Ionicons
                    name={a.unlocked ? 'trophy-outline' : 'lock-closed-outline'}
                    size={24}
                    color={a.unlocked ? '#10B981' : '#9CA3AF'}
                  />
                  <Text style={styles.achievementLabel} numberOfLines={2}>
                    {a.title}
                  </Text>
                </Card>
              ))
            )}
          </View>
          <TouchableOpacity
            style={[styles.payButton, { backgroundColor: '#2563EB' }]}
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
          <View style={styles.modalContainer}>
            {/* Header del Modal */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {isFirstLogin 
                  ? '¡Bienvenido a FluxPay! 👋' 
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
                }}>
                  <Text style={styles.modalClose}>✕</Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView style={styles.modalContent}>
              {isFirstLogin ? (
                <View style={styles.welcomeContainer}>
                  <Text style={styles.welcomeText}>
                    Para comenzar, registra tu primer pago. Te ayudaremos a gestionar todos tus pagos y recibirás recordatorios para que nunca olvides realizar tus pagos a tiempo.
                  </Text>
                </View>
              ) : (
                <Text style={styles.modalSubtitle}>
                  Completa la información del pago mensual
                </Text>
              )}

              {/* Nombre del pago */}
              <Text style={styles.inputLabel}>
                Nombre del pago <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={styles.input}
                placeholder="ej: Netflix, Luz, Internet"
                value={paymentName}
                onChangeText={setPaymentName}
                placeholderTextColor="#9CA3AF"
              />

              {/* Monto */}
              <Text style={styles.inputLabel}>
                Monto <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.amountRow}>
                <TextInput
                  style={[styles.input, styles.amountInput]}
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={setAmount}
                  placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity 
                  style={styles.currencyContainer}
                  onPress={() => {
                    setCurrency(currency === 'COP' ? 'USD' : currency === 'USD' ? 'EUR' : 'COP');
                  }}
                >
                  <Text style={styles.currencyText}>$ {currency}</Text>
                </TouchableOpacity>
              </View>

              {/* Fecha de vencimiento */}
              <Text style={styles.inputLabel}>
                Fecha de vencimiento <Text style={styles.required}>*</Text>
              </Text>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowDueDatePicker(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.dateInputText}>
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
              <Text style={styles.inputHint}>
                ℹ️ La fecha se ajustará automáticamente al último día del mes
              </Text>

              {/* Categoría */}
              <Text style={styles.inputLabel}>
                Categoría <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.pickerContainer}>
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

              {/* Configurar Enlace de Pago */}
              {/* Configurar Método de Pago */}
              <Text style={styles.sectionHeaderText}>💳 Método de pago</Text>

              {/* Opción 1: Link Web */}
              <TouchableOpacity 
                style={styles.paymentMethodButton}
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
                <Text style={styles.paymentMethodIcon}>🌐</Text>
                <View style={styles.paymentMethodInfo}>
                  <Text style={styles.paymentMethodTitle}>Link Web (URL)</Text>
                  <Text style={styles.paymentMethodDesc}>
                    {paymentUrl || 'No configurado'}
                  </Text>
                </View>
                {paymentUrl && (
                  <TouchableOpacity onPress={() => setPaymentUrl('')}>
                    <Text style={styles.clearIcon}>✕</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              {/* Opción 2: Seleccionar App */}
              <TouchableOpacity 
                style={styles.paymentMethodButton}
                onPress={() => {
                  Alert.alert(
                    'Seleccionar Aplicación',
                    'Elige qué aplicación abrir al presionar "Pagar"',
                    [
                      {
                        text: 'Bancolombia',
                        onPress: () => {
                          setDeepLink('com.todo1.mobile');
                          setPaymentUrl('');
                        }
                      },
                      {
                        text: 'Nequi',
                        onPress: () => {
                          setDeepLink('com.nequi.MobileApp');
                          setPaymentUrl('');
                        }
                      },
                      {
                        text: 'Daviplata',
                        onPress: () => {
                          setDeepLink('com.daviplata.mobile');
                          setPaymentUrl('');
                        }
                      },
                      {
                        text: 'PSE',
                        onPress: () => {
                          setDeepLink('co.com.pse.mobile');
                          setPaymentUrl('');
                        }
                      },
                      {
                        text: 'Otra app',
                        onPress: () => {
                          promptText(
                            'Nombre del Paquete',
                            'Ingresa el nombre del paquete de la app (ej: com.banco.app)',
                            deepLink,
                            (pkg) => {
                              setDeepLink(pkg);
                              setPaymentUrl('');
                            }
                          );
                        }
                      },
                      { text: 'Cancelar', style: 'cancel' }
                    ]
                  );
                }}
              >
                <Text style={styles.paymentMethodIcon}>📱</Text>
                <View style={styles.paymentMethodInfo}>
                  <Text style={styles.paymentMethodTitle}>Aplicación del Teléfono</Text>
                  <Text style={styles.paymentMethodDesc}>
                    {deepLink || 'No configurado'}
                  </Text>
                </View>
                {deepLink && (
                  <TouchableOpacity onPress={() => setDeepLink('')}>
                    <Text style={styles.clearIcon}>✕</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>

              {/* Botones */}
              <View style={styles.modalButtons}>
                {!isFirstLogin && (
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowModal(false);
                      setEditingPayment(null);
                      setPaymentName('');
                      setAmount('');
                      setDueDateDate(null);
                      setCategory('');
                      setPaymentUrl('');
                      setDeepLink('');
                    }}
                  >
                    <Text style={styles.cancelButtonText}>Cancelar</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[
                    styles.saveButton, 
                    loading && styles.saveButtonDisabled,
                    isFirstLogin && styles.saveButtonFullWidth
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
    backgroundColor: '#F9FAFB',
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
    color: '#111827',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
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
    color: '#111827',
  },
  addButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyText: {
    textAlign: 'center',
    color: '#6B7280',
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
    color: '#6B7280',
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#2563EB',
  },
  achievementCount: {
    fontSize: 14,
    color: '#6B7280',
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
    color: '#6B7280',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
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
    borderBottomColor: '#F3F4F6',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#111827',
  },
  modalClose: {
    fontSize: 28,
    color: '#9CA3AF',
    fontWeight: '300',
  },
  modalContent: {
    padding: 20,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  required: {
    color: '#EF4444',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#111827',
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
  },
  dateInputText: {
    fontSize: 16,
    color: '#111827',
  },
  pickerContainer: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  placeholder: {
    color: '#9CA3AF',
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
    borderColor: '#D1D5DB',
    borderRadius: 12,
    padding: 14,
    justifyContent: 'center',
    backgroundColor: '#F9FAFB',
    minWidth: 100,
  },
  currencyText: {
    fontSize: 16,
    color: '#111827',
    textAlign: 'center',
  },
  inputHint: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: -12,
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
    marginBottom: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#2563EB',
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
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
  },
  welcomeText: {
    fontSize: 15,
    color: '#1E40AF',
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
    color: '#111827',
    marginBottom: 4,
  },
  paymentCategory: {
    fontSize: 12,
    color: '#6B7280',
    textTransform: 'uppercase',
  },
  paymentAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2563EB',
  },
  paymentMethodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  paymentMethodIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  paymentMethodDesc: {
    fontSize: 13,
    color: '#6B7280',
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
    borderTopColor: '#F3F4F6',
  },
  paymentDate: {
    fontSize: 12,
    color: '#6B7280',
  },
  paymentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentActionButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#F3F4F6',
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
  },
  payButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  sectionHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#111827',
    marginTop: 20,
    marginBottom: 4,
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
