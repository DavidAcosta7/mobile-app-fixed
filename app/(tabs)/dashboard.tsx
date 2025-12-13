import { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert, Modal, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { StatCard } from '../../components/ui/StatCard';
import { TabBar } from '../../components/ui/TabBar';
import { Card } from '../../components/ui/Card';

export default function DashboardScreen() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('Todos');
  const [showModal, setShowModal] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [paymentName, setPaymentName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('COP');
  const [dueDate, setDueDate] = useState('');
  const [category, setCategory] = useState('');
  const [icon, setIcon] = useState('');
  const [editingPayment, setEditingPayment] = useState<any>(null);

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

  useEffect(() => {
    if (user?.id) {
      loadPayments();
    }
  }, [user?.id]);

  const handleSavePayment = async () => {
    // Validaciones
    if (!paymentName || !amount || !dueDate || !category) {
      Alert.alert('Error', 'Por favor completa todos los campos obligatorios');
      return;
    }

    try {
      setLoading(true);

      // Parsear fecha
      const [day, month, year] = dueDate.split('/');
      const parsedDate = new Date(`${year}-${month}-${day}`);
      
      if (isNaN(parsedDate.getTime())) {
        Alert.alert('Error', 'Fecha inválida. Usa formato dd/mm/aaaa');
        return;
      }

      if (editingPayment) {
        // Actualizar pago existente
        const { error } = await supabase
          .from('payments')
          .update({
            name: paymentName,
            amount: parseFloat(amount),
            currency: currency,
            category: category,
            due_date: parsedDate.toISOString(),
            selected_date: parsedDate.toISOString(),
            icon: icon || '💳',
          })
          .eq('id', editingPayment.id);

        if (error) throw error;
        Alert.alert('Éxito', 'Pago actualizado correctamente');
      } else {
        // Crear nuevo pago
        const { error } = await supabase
          .from('payments')
          .insert({
            user_id: user?.id,
            name: paymentName,
            amount: parseFloat(amount),
            currency: currency,
            category: category,
            due_date: parsedDate.toISOString(),
            selected_date: parsedDate.toISOString(),
            status: 'PENDING',
            icon: icon || '💳',
            description: '',
            auto_debit: false,
          });

        if (error) throw error;
        Alert.alert('Éxito', 'Pago agregado correctamente');
      }

      // Resetear form
      setShowModal(false);
      setPaymentName('');
      setAmount('');
      setDueDate('');
      setCategory('');
      setIcon('');
      setEditingPayment(null);
      
      // Recargar pagos
      loadPayments();
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
    setIcon(payment.icon || '');
    const date = new Date(payment.due_date);
    setDueDate(`${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`);
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

  const filteredPayments = payments.filter((payment) => {
    if (activeTab === 'Todos') return true;
    if (activeTab === 'Pendientes') return payment.status === 'PENDING';
    if (activeTab === 'Urgentes') return payment.status === 'URGENT';
    if (activeTab === 'Pagados') return payment.status === 'COMPLETED';
    return true;
  });

  const stats = [
    { label: 'Total Pagos', value: payments.length.toString(), icon: '💳', color: 'blue' as const },
    { label: 'Pendientes', value: payments.filter(p => p.status === 'PENDING').length.toString(), icon: '⏱️', color: 'orange' as const },
    { label: 'Urgentes', value: payments.filter(p => p.status === 'URGENT').length.toString(), icon: '🔴', color: 'red' as const },
    { label: 'Total Mensual', value: `$${payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0).toFixed(2)}`, icon: '💰', color: 'green' as const },
  ];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>FLUXPAY</Text>
          <Text style={styles.subtitle}>
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
              <Text style={styles.addButtonText}>+ Agregar Pago</Text>
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
                    <Text style={styles.paymentIcon}>{payment.icon || '💳'}</Text>
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
                        <Text style={styles.paymentActionText}>✏️ Editar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.paymentActionButton, styles.deleteButton]}
                        onPress={() => handleDeletePayment(payment)}
                      >
                        <Text style={styles.paymentActionText}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
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
            <Text style={styles.sectionTitle}>🏆 Tus Logros</Text>
            <Text style={styles.achievementCount}>0/26</Text>
          </View>
          <View style={styles.achievementGrid}>
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} style={styles.achievementCard}>
                <Text style={styles.achievementIcon}>🔒</Text>
                <Text style={styles.achievementLabel}>Bloqueado</Text>
              </Card>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Modal Agregar Pago */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* Header del Modal */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingPayment ? 'Editar Pago' : 'Agregar Nuevo Pago'}
              </Text>
              <TouchableOpacity onPress={() => {
                setShowModal(false);
                setEditingPayment(null);
                setPaymentName('');
                setAmount('');
                setDueDate('');
                setCategory('');
                setIcon('');
              }}>
                <Text style={styles.modalClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <Text style={styles.modalSubtitle}>
                Completa la información del pago mensual
              </Text>

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
              <TextInput
                style={styles.input}
                placeholder="dd/mm/aaaa"
                value={dueDate}
                onChangeText={setDueDate}
                placeholderTextColor="#9CA3AF"
              />
              <Text style={styles.inputHint}>
                ℹ️ La fecha se ajustará automáticamente al último día del mes
              </Text>

              {/* Categoría */}
              <Text style={styles.inputLabel}>
                Categoría <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.categoryGrid}>
                {['SERVICIOS', 'ENTRETENIMIENTO', 'TRANSPORTE', 'SALUD', 'ALIMENTACION', 'OTROS'].map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryButton,
                      category === cat && styles.categoryButtonActive
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      category === cat && styles.categoryButtonTextActive
                    ]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Icono */}
              <Text style={styles.inputLabel}>Icono (opcional)</Text>
              <TextInput
                style={styles.input}
                placeholder="ej: 📱 💡 🎵"
                placeholderTextColor="#9CA3AF"
                value={icon}
                onChangeText={setIcon}
              />

              {/* Botones */}
              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => {
                    setShowModal(false);
                    setEditingPayment(null);
                    setPaymentName('');
                    setAmount('');
                    setDueDate('');
                    setCategory('');
                    setIcon('');
                  }}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, loading && styles.saveButtonDisabled]}
                  onPress={handleSavePayment}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveButtonText}>Guardar</Text>
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
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
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
    fontSize: 32,
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
});
