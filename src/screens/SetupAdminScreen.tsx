import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as db from '../services/database';
import * as cryptoService from '../auth/cryptoService';
import { useAuth } from '../auth/AuthContext';

export const SetupAdminScreen: React.FC = () => {
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [loading, setLoading] = useState(false);
  const { checkHasUsers, login } = useAuth();

  const validateForm = (): boolean => {
    if (!username.trim()) {
      Alert.alert('Error', 'El nombre de usuario es requerido');
      return false;
    }

    if (username.length < 3) {
      Alert.alert('Error', 'El nombre de usuario debe tener al menos 3 caracteres');
      return false;
    }

    if (!pin.trim()) {
      Alert.alert('Error', 'El PIN es requerido');
      return false;
    }

    if (pin.length < 4) {
      Alert.alert('Error', 'El PIN debe tener al menos 4 dígitos');
      return false;
    }

    if (pin !== confirmPin) {
      Alert.alert('Error', 'Los PINs no coinciden');
      return false;
    }

    return true;
  };

  const handleCreateAdmin = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // Generar salt y hash del PIN
      const salt = await cryptoService.generateSalt();
      const hash = await cryptoService.hashPin(pin, salt);

      // Crear usuario admin
      await db.createUser({
        username: username.trim(),
        role: 'admin',
        pin_salt: salt,
        pin_hash: hash,
        is_active: 1,
      });

      Alert.alert(
        'Éxito',
        'Administrador creado correctamente',
        [
          {
            text: 'Continuar',
            onPress: async () => {
              await checkHasUsers();
              // Iniciar sesión automáticamente
              await login(username.trim(), pin);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error al crear admin:', error);
      Alert.alert('Error', 'No se pudo crear el administrador');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <View style={styles.header}>
              <Text style={styles.icon}>🔐</Text>
              <Text style={styles.title}>Configuración Inicial</Text>
              <Text style={styles.subtitle}>
                Crea tu cuenta de administrador para empezar a usar la aplicación
              </Text>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>Nombre de usuario</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                placeholder="Ej: admin"
                placeholderTextColor="#999"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />

              <Text style={styles.label}>PIN (mínimo 4 dígitos)</Text>
              <TextInput
                style={styles.input}
                value={pin}
                onChangeText={setPin}
                placeholder="****"
                placeholderTextColor="#999"
                secureTextEntry
                keyboardType="number-pad"
                maxLength={6}
                editable={!loading}
              />

              <Text style={styles.label}>Confirmar PIN</Text>
              <TextInput
                style={styles.input}
                value={confirmPin}
                onChangeText={setConfirmPin}
                placeholder="****"
                placeholderTextColor="#999"
                secureTextEntry
                keyboardType="number-pad"
                maxLength={6}
                editable={!loading}
              />

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleCreateAdmin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Crear Administrador</Text>
                )}
              </TouchableOpacity>

              <View style={styles.infoBox}>
                <Text style={styles.infoText}>
                  💡 El administrador tiene acceso completo a todas las funciones de la aplicación.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  icon: {
    fontSize: 64,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 22,
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#333',
  },
  button: {
    backgroundColor: '#2196F3',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 24,
    elevation: 2,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  infoText: {
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
  },
});

