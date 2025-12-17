import { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  TouchableOpacity, 
  TextInput,
  StyleSheet, 
  Alert,
  Modal,
  ActivityIndicator,
  Platform,
  StatusBar
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Header } from '../components/Header';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useTheme } from '../contexts/ThemeContext';

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const { theme, resolvedMode } = useTheme();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [financialLevel, setFinancialLevel] = useState(0);
  const [experiencePoints, setExperiencePoints] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // ✅ useEffect ANTES del return condicional
  useEffect(() => {
    if (user?.id) {
      loadUserData();
    } else {
      console.log('Waiting for user...');
    }
  }, [user?.id]);

  // ✅ Ahora sí el return condicional
  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Header />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Cargando perfil...</Text>
        </View>
      </View>
    );
  }

  const loadUserData = async () => {
    try {
      if (!user?.id) {
        console.error('No user ID');
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Supabase error:', error);
        return;
      }

      if (data) {
        setName(data.name || '');
        setEmail(data.email || '');
        setPhone(data.phone || '');
        setFinancialLevel(typeof data.financial_level === 'number' ? data.financial_level : 0);
        setExperiencePoints(typeof data.experience_points === 'number' ? data.experience_points : 0);
        setCurrentStreak(typeof data.current_streak === 'number' ? data.current_streak : 0);
        setAvatarUrl(data.avatar_url || '');
      }
    } catch (error) {
      console.error('Error loading user:', error);
    }
  };

  const handleSaveChanges = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'No se pudo identificar al usuario');
      return;
    }
    
    if (!name.trim()) {
      Alert.alert('Error', 'El nombre no puede estar vacío');
      return;
    }
    
    try {
      setLoading(true);
      
      // Actualizar en la tabla de perfiles
      const { error: profileError } = await supabase
        .from('users')
        .update({ 
          name: name.trim(),
          phone: phone.trim() || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (profileError) throw profileError;
      
      // Actualizar también en auth.users si es necesario
      const { error: authError } = await supabase.auth.updateUser({
        data: { name: name.trim() }
      });
      
      if (authError) throw authError;
      
      Alert.alert('Éxito', 'Perfil actualizado correctamente');
    } catch (error) {
      console.error('Error al actualizar perfil:', error);
      Alert.alert('Error', 'No se pudo actualizar el perfil. Por favor, inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0]) {
      try {
        if (!user?.id) return;
        setLoading(true);

        const asset = result.assets[0];
        const base64 = asset.base64;
        const ext = (asset.fileName?.split('.').pop() || 'jpg').toLowerCase();
        const contentType = asset.mimeType || (ext === 'png' ? 'image/png' : 'image/jpeg');

        if (!base64) {
          Alert.alert('Error', 'No se pudo obtener la imagen en formato base64');
          return;
        }

        const filePath = `${user.id}/${Date.now()}.${ext === 'png' ? 'png' : 'jpg'}`;

        // Convert base64 to binary
        const binaryString = global.atob ? global.atob(base64) : atob(base64);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const arrayBuffer = bytes.buffer;

        const { error: uploadError } = await supabase
          .storage
          .from('avatars')
          .upload(filePath, arrayBuffer, { contentType, upsert: true });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          Alert.alert(
            'Error',
            'No se pudo subir la imagen. Verifica que exista el bucket "avatars" en Supabase Storage (public) y que tengas permisos.'
          );
          return;
        }

        const { data: publicUrlData } = supabase
          .storage
          .from('avatars')
          .getPublicUrl(filePath);

        const publicUrl = publicUrlData?.publicUrl || '';
        if (!publicUrl) {
          Alert.alert('Error', 'No se pudo obtener la URL pública de la imagen');
          return;
        }

        const { error: updateErr } = await supabase
          .from('users')
          .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
          .eq('id', user.id);

        if (updateErr) {
          console.error('DB update error:', updateErr);
          Alert.alert('Error', 'No se pudo guardar la foto de perfil en la base de datos');
          return;
        }

        setAvatarUrl(publicUrl);
        Alert.alert('Éxito', 'Tu foto de perfil fue actualizada');
      } catch (e) {
        console.error('Error uploading profile photo:', e);
        Alert.alert('Error', 'No se pudo actualizar la foto de perfil');
      } finally {
        setLoading(false);
      }
    }
  };

  const handleChangePassword = () => {
    setShowPasswordModal(true);
  };

  const handleSavePassword = async () => {
    if (!user?.id) {
      Alert.alert('Error', 'No se pudo identificar al usuario');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      setLoading(true);
      
      // Actualizar contraseña en Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) throw error;

      // Registrar el cambio de contraseña en la base de datos
      const { error: logError } = await supabase
        .from('user_security_logs')
        .insert({
          user_id: user.id,
          action: 'password_change',
          ip_address: null, // Podrías obtener esto de una solicitud si es necesario
          user_agent: null  // Podrías obtener esto de una solicitud si es necesario
        });

      if (logError) console.warn('No se pudo registrar el cambio de contraseña:', logError);

      Alert.alert('Éxito', 'Tu contraseña ha sido actualizada correctamente');
      setShowPasswordModal(false);
      setNewPassword('');
    } catch (error) {
      console.error('Error al actualizar contraseña:', error);
      
      let errorMessage = 'No se pudo cambiar la contraseña';
      if (error instanceof Error) {
        if (error.message.includes('password')) {
          errorMessage = 'La contraseña no cumple con los requisitos de seguridad';
        } else if (error.message.includes('network')) {
          errorMessage = 'Error de conexión. Verifica tu conexión a internet';
        }
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Header />
      <ScrollView style={styles.content}>
        {/* Foto de Perfil */}
        <View style={[styles.section, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Foto de perfil</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
            Agrega una foto desde URL o tu dispositivo
          </Text>
          <View style={styles.avatarContainer}>
            <TouchableOpacity 
              style={[styles.avatarLarge, { backgroundColor: theme.primary }]}
              onPress={pickImage}
            >
              {avatarUrl ? (
                <Image
                  source={{ uri: avatarUrl }}
                  style={styles.avatarImage}
                  contentFit="cover"
                />
              ) : (
                <Text style={styles.avatarLargeText}>
                  {name.charAt(0) || 'U'}
                </Text>
              )}
              <View style={[styles.avatarEditBadge, { backgroundColor: theme.primary, borderColor: theme.card }]}>
                <Ionicons name="camera-outline" size={16} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <Text style={[styles.avatarHelp, { color: theme.textSecondary }]}>
              Toca la foto para cambiarla
            </Text>
          </View>
        </View>

        {/* Perfil */}
        <View style={[styles.section, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Perfil</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
            Actualiza tu información personal
          </Text>

          <Text style={[styles.label, { color: theme.textSecondary }]}>Nombre completo</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.border, backgroundColor: resolvedMode === 'dark' ? theme.border : theme.card, color: theme.text }]}
            value={name}
            onChangeText={setName}
            placeholder="Tu nombre"
            placeholderTextColor={theme.textSecondary}
          />

          <Text style={[styles.label, { color: theme.textSecondary }]}>Email</Text>
          <TextInput
            style={[styles.input, styles.inputDisabled, { borderColor: theme.border, backgroundColor: resolvedMode === 'dark' ? theme.border : '#F3F4F6' }]}
            value={email}
            editable={false}
            placeholderTextColor={theme.textSecondary}
          />

          <Text style={[styles.label, { color: theme.textSecondary }]}>Teléfono</Text>
          <TextInput
            style={[styles.input, { borderColor: theme.border, backgroundColor: resolvedMode === 'dark' ? theme.border : theme.card, color: theme.text }]}
            value={phone}
            onChangeText={setPhone}
            placeholder="+57 300 000 0000"
            keyboardType="phone-pad"
            placeholderTextColor={theme.textSecondary}
          />

          <TouchableOpacity 
            style={[styles.saveButton, { backgroundColor: theme.primary, opacity: loading ? 0.7 : 1 }]}
            onPress={handleSaveChanges}
            disabled={loading}
          >
            <Text style={styles.saveButtonText}>
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Información de cuenta */}
        <View style={[styles.section, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Información de cuenta</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
            Detalles de tu cuenta FluxPay
          </Text>

          <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Nivel financiero</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>Nivel {financialLevel}</Text>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Puntos de experiencia</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{experiencePoints} XP</Text>
          </View>

          <View style={[styles.infoRow, { borderBottomColor: theme.border }]}>
            <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Racha actual</Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>{currentStreak} días</Text>
          </View>
        </View>

        {/* Seguridad */}
        <View style={[styles.section, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Seguridad</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
            Gestiona la seguridad de tu cuenta
          </Text>

          <TouchableOpacity 
            style={[styles.securityButton, { backgroundColor: resolvedMode === 'dark' ? theme.border : '#F3F4F6', borderColor: theme.border }]}
            onPress={handleChangePassword}
          >
            <View style={styles.securityButtonContent}>
              <Ionicons name="key-outline" size={20} color={theme.textSecondary} />
              <Text style={[styles.securityButtonText, { color: theme.text }]}>Cambiar contraseña</Text>
            </View>
          </TouchableOpacity>
        </View>

          <View style={{ height: 40 }} />
        </ScrollView>

        {/* Modal Cambiar Contraseña */}
      <Modal
        visible={showPasswordModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => {
          setShowPasswordModal(false);
          setNewPassword('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Text style={[styles.modalTitle, { color: theme.text }]}>Cambiar Contraseña</Text>
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              Ingresa tu nueva contraseña
            </Text>
            <TextInput
              style={[styles.input, { borderColor: theme.border, backgroundColor: resolvedMode === 'dark' ? theme.border : theme.card, color: theme.text }]}
              placeholder="Nueva contraseña"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              placeholderTextColor={theme.textSecondary}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalCancelButton, { backgroundColor: resolvedMode === 'dark' ? theme.border : '#F3F4F6' }]}
                onPress={() => {
                  setShowPasswordModal(false);
                  setNewPassword('');
                }}
              >
                <Text style={[styles.modalCancelText, { color: theme.textSecondary }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveButton, { backgroundColor: theme.primary }]}
                onPress={handleSavePassword}
              >
                <Text style={styles.modalSaveText}>Cambiar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 16,
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatarLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarLargeText: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  avatarHelp: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
  },
  inputDisabled: {
    backgroundColor: '#F3F4F6',
    color: '#9CA3AF',
  },
  saveButton: {
    backgroundColor: '#2563EB',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#2563EB',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  avatarEditIcon: {
    fontSize: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  infoLabel: {
    fontSize: 15,
    color: '#6B7280',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  securityButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  securityButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  securityButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 14,
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
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

