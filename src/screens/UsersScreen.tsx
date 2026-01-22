import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Keyboard,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  TouchableWithoutFeedback,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { User } from '../models/User';
import * as db from '../services/database';
import * as cryptoService from '../auth/cryptoService';
import { useAuth } from '../auth/AuthContext';

export const UsersScreen: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [resetPinModalVisible, setResetPinModalVisible] = useState(false);
  const [resetPinUser, setResetPinUser] = useState<User | null>(null);
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    pin: '',
    confirmPin: '',
    role: 'seller' as 'admin' | 'seller',
  });
  const { currentUser } = useAuth();

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [])
  );

  const loadUsers = async () => {
    try {
      setLoading(true);
      const allUsers = await db.getAllUsers();
      setUsers(allUsers);
    } catch (error) {
      Alert.alert('Error', 'No se pudieron cargar los usuarios');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (user?: User) => {
    if (user) {
      // Modo edición
      setEditingUser(user);
      setIsEditing(true);
      setFormData({
        username: user.username,
        pin: '',
        confirmPin: '',
        role: user.role,
      });
    } else {
      // Modo creación
      setEditingUser(null);
      setIsEditing(false);
      setFormData({
        username: '',
        pin: '',
        confirmPin: '',
        role: 'seller',
      });
    }
    setModalVisible(true);
  };

  const closeModal = () => {
    setModalVisible(false);
    setEditingUser(null);
    setIsEditing(false);
    setFormData({
      username: '',
      pin: '',
      confirmPin: '',
      role: 'seller',
    });
  };

  const validateForm = (): boolean => {
    if (!formData.username.trim()) {
      Alert.alert('Error', 'El nombre de usuario es requerido');
      return false;
    }

    if (formData.username.length < 3) {
      Alert.alert('Error', 'El nombre de usuario debe tener al menos 3 caracteres');
      return false;
    }

    // Solo validar PIN en modo creación
    if (!isEditing) {
      if (!formData.pin.trim()) {
        Alert.alert('Error', 'El PIN es requerido');
        return false;
      }

      if (formData.pin.length < 4) {
        Alert.alert('Error', 'El PIN debe tener al menos 4 dígitos');
        return false;
      }

      if (formData.pin !== formData.confirmPin) {
        Alert.alert('Error', 'Los PINs no coinciden');
        return false;
      }
    }

    return true;
  };

  const handleCreateUser = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      // Generar salt y hash del PIN
      const salt = await cryptoService.generateSalt();
      const hash = await cryptoService.hashPin(formData.pin, salt);

      // Crear usuario
      await db.createUser({
        username: formData.username.trim(),
        role: formData.role,
        pin_salt: salt,
        pin_hash: hash,
        is_active: 1,
      });

      Alert.alert('Éxito', 'Usuario creado correctamente');
      closeModal();
      loadUsers();
    } catch (error: any) {
      console.error('Error al crear usuario:', error);
      if (error.message?.includes('UNIQUE constraint')) {
        Alert.alert('Error', 'Ya existe un usuario con ese nombre');
      } else {
        Alert.alert('Error', 'No se pudo crear el usuario');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    // Validar username
    if (!formData.username.trim()) {
      Alert.alert('Error', 'El nombre de usuario es requerido');
      return;
    }

    if (formData.username.length < 3) {
      Alert.alert('Error', 'El nombre de usuario debe tener al menos 3 caracteres');
      return;
    }

    // Verificar si está cambiando el role del último admin
    if (editingUser.role === 'admin' && formData.role === 'seller') {
      const activeAdmins = users.filter(u => u.role === 'admin' && u.is_active);
      if (activeAdmins.length === 1) {
        Alert.alert(
          'Error',
          'No puedes cambiar el rol del último administrador activo'
        );
        return;
      }
    }

    try {
      setLoading(true);

      await db.updateUser(editingUser.id!, formData.username.trim(), formData.role);

      Alert.alert('Éxito', 'Usuario actualizado correctamente');
      closeModal();
      loadUsers();
    } catch (error: any) {
      console.error('Error al actualizar usuario:', error);
      if (error.message?.includes('UNIQUE constraint')) {
        Alert.alert('Error', 'Ya existe un usuario con ese nombre');
      } else {
        Alert.alert('Error', 'No se pudo actualizar el usuario');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    // No permitir desactivar el último admin
    if (user.role === 'admin' && user.is_active) {
      const activeAdmins = users.filter(u => u.role === 'admin' && u.is_active);
      if (activeAdmins.length === 1) {
        Alert.alert(
          'Error',
          'No puedes desactivar el último administrador activo'
        );
        return;
      }
    }

    // No permitir desactivarse a sí mismo
    if (user.id === currentUser?.id) {
      Alert.alert('Error', 'No puedes desactivar tu propia cuenta');
      return;
    }

    const action = user.is_active ? 'desactivar' : 'activar';
    Alert.alert(
      'Confirmar',
      `¿Deseas ${action} al usuario "${user.username}"?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: async () => {
            try {
              setLoading(true);
              await db.setUserActive(user.id!, !user.is_active);
              loadUsers();
            } catch (error) {
              Alert.alert('Error', `No se pudo ${action} el usuario`);
              console.error(error);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const openResetPinModal = (user: User) => {
    setResetPinUser(user);
    setNewPin('');
    setConfirmNewPin('');
    setResetPinModalVisible(true);
  };

  const closeResetPinModal = () => {
    setResetPinModalVisible(false);
    setResetPinUser(null);
    setNewPin('');
    setConfirmNewPin('');
  };

  const handleResetPin = async () => {
    if (!resetPinUser) return;

    if (!newPin.trim()) {
      Alert.alert('Error', 'El PIN es requerido');
      return;
    }

    if (newPin.length < 4) {
      Alert.alert('Error', 'El PIN debe tener al menos 4 dígitos');
      return;
    }

    if (newPin !== confirmNewPin) {
      Alert.alert('Error', 'Los PINs no coinciden');
      return;
    }

    try {
      setLoading(true);
      const salt = await cryptoService.generateSalt();
      const hash = await cryptoService.hashPin(newPin, salt);
      await db.updateUserPin(resetPinUser.id!, salt, hash);
      Alert.alert('Éxito', 'PIN actualizado correctamente');
      closeResetPinModal();
    } catch (error) {
      Alert.alert('Error', 'No se pudo actualizar el PIN');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = (user: User) => {
    // No permitir eliminar el último admin activo
    if (user.role === 'admin' && user.is_active) {
      const activeAdmins = users.filter(u => u.role === 'admin' && u.is_active);
      if (activeAdmins.length === 1) {
        Alert.alert(
          'Error',
          'No puedes eliminar el último administrador activo'
        );
        return;
      }
    }

    // No permitir auto-eliminación
    if (user.id === currentUser?.id) {
      Alert.alert('Error', 'No puedes eliminar tu propia cuenta');
      return;
    }

    Alert.alert(
      'Confirmar eliminación',
      `¿Estás seguro de eliminar al usuario "${user.username}"?\n\nEsta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              await db.deleteUser(user.id!);
              Alert.alert('Éxito', 'Usuario eliminado correctamente');
              loadUsers();
            } catch (error) {
              Alert.alert('Error', 'No se pudo eliminar el usuario');
              console.error(error);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderUser = ({ item }: { item: User }) => (
    <View style={styles.userCard}>
      <View style={styles.userInfo}>
        <View style={styles.userHeader}>
          <Text style={styles.userName}>{item.username}</Text>
          {item.id === currentUser?.id && (
            <View style={styles.currentBadge}>
              <Text style={styles.currentBadgeText}>Tú</Text>
            </View>
          )}
        </View>
        <View style={styles.userMeta}>
          <View style={[styles.roleBadge, item.role === 'admin' ? styles.adminBadge : styles.sellerBadge]}>
            <Text style={styles.roleBadgeText}>
              {item.role === 'admin' ? '👑 Admin' : '💼 Vendedor'}
            </Text>
          </View>
          <View style={[styles.statusBadge, item.is_active ? styles.activeBadge : styles.inactiveBadge]}>
            <Text style={styles.statusBadgeText}>
              {item.is_active ? '✓ Activo' : '✕ Inactivo'}
            </Text>
          </View>
        </View>
      </View>
      <View style={styles.userActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => openModal(item)}
        >
          <Text style={styles.actionButtonText}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.toggleButton]}
          onPress={() => handleToggleActive(item)}
        >
          <Text style={styles.actionButtonText}>
            {item.is_active ? 'Desactivar' : 'Activar'}
          </Text>
        </TouchableOpacity>
        {item.role === 'seller' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.resetButton]}
            onPress={() => openResetPinModal(item)}
          >
            <Text style={styles.actionButtonText}>Reset PIN</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteUser(item)}
        >
          <Text style={styles.actionButtonText}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Verificar si el usuario actual es admin
  if (currentUser?.role !== 'admin') {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>🚫</Text>
          <Text style={styles.errorText}>Acceso denegado</Text>
          <Text style={styles.errorSubtext}>Solo los administradores pueden gestionar usuarios</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Gestión de Usuarios</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => openModal()}
        >
          <Text style={styles.addButtonText}>+ Crear</Text>
        </TouchableOpacity>
      </View>

      {loading && users.length === 0 ? (
        <ActivityIndicator size="large" color="#2196F3" style={styles.loader} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={item => item.id!.toString()}
          renderItem={renderUser}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay usuarios registrados</Text>
          }
        />
      )}

      {/* Modal de Crear Usuario */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <TouchableWithoutFeedback onPress={closeModal}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.keyboardView}
            >
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>
                      {isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
                    </Text>
                    <TouchableOpacity onPress={closeModal}>
                      <Text style={styles.closeButton}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView 
                    style={styles.formScroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={!isEditing}
                  >
                    <View style={styles.form}>
                      <Text style={styles.label}>Nombre de usuario</Text>
                      <TextInput
                        style={styles.input}
                        value={formData.username}
                        onChangeText={text => setFormData({ ...formData, username: text })}
                        returnKeyType="next"
                        placeholder="Ej: vendedor1"
                        placeholderTextColor="#999"
                        autoCapitalize="none"
                      />

                      <Text style={styles.label}>Rol</Text>
                      <View style={styles.roleSelector}>
                        <TouchableOpacity
                          style={[
                            styles.roleOption,
                            formData.role === 'seller' && styles.roleOptionActive,
                          ]}
                          onPress={() => setFormData({ ...formData, role: 'seller' })}
                        >
                          <Text
                            style={[
                              styles.roleOptionText,
                              formData.role === 'seller' && styles.roleOptionTextActive,
                            ]}
                          >
                            💼 Vendedor
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.roleOption,
                            formData.role === 'admin' && styles.roleOptionActive,
                          ]}
                          onPress={() => setFormData({ ...formData, role: 'admin' })}
                        >
                          <Text
                            style={[
                              styles.roleOptionText,
                              formData.role === 'admin' && styles.roleOptionTextActive,
                            ]}
                          >
                            👑 Admin
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {!isEditing && (
                        <>
                          <Text style={styles.label}>PIN (mínimo 4 dígitos)</Text>
                          <TextInput
                            style={styles.input}
                            value={formData.pin}
                            onChangeText={text => setFormData({ ...formData, pin: text })}
                            returnKeyType="next"
                            placeholder="****"
                            placeholderTextColor="#999"
                            secureTextEntry
                            keyboardType="number-pad"
                            maxLength={6}
                          />

                          <Text style={styles.label}>Confirmar PIN</Text>
                          <TextInput
                            style={styles.input}
                            value={formData.confirmPin}
                            onChangeText={text => setFormData({ ...formData, confirmPin: text })}
                            returnKeyType="done"
                            placeholder="****"
                            placeholderTextColor="#999"
                            secureTextEntry
                            keyboardType="number-pad"
                            maxLength={6}
                          />
                        </>
                      )}

                      <View style={styles.formButtons}>
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={closeModal}
                        >
                          <Text style={styles.cancelButtonText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.saveButton}
                          onPress={isEditing ? handleUpdateUser : handleCreateUser}
                          disabled={loading}
                        >
                          {loading ? (
                            <ActivityIndicator color="#fff" />
                          ) : (
                            <Text style={styles.saveButtonText}>
                              {isEditing ? 'Actualizar' : 'Crear'}
                            </Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Modal de Resetear PIN */}
      <Modal
        visible={resetPinModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={closeResetPinModal}
      >
        <TouchableWithoutFeedback onPress={closeResetPinModal}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={styles.keyboardView}
            >
              <TouchableWithoutFeedback onPress={() => {}}>
                <View style={styles.modalContent}>
                  <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>
                      Resetear PIN - {resetPinUser?.username}
                    </Text>
                    <TouchableOpacity onPress={closeResetPinModal}>
                      <Text style={styles.closeButton}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView 
                    style={styles.formScroll}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                  >
                    <View style={styles.form}>
                      <Text style={styles.label}>Nuevo PIN (mínimo 4 dígitos)</Text>
                      <TextInput
                        style={styles.input}
                        value={newPin}
                        onChangeText={setNewPin}
                        returnKeyType="next"
                        placeholder="****"
                        placeholderTextColor="#999"
                        secureTextEntry
                        keyboardType="number-pad"
                        maxLength={6}
                      />

                      <Text style={styles.label}>Confirmar nuevo PIN</Text>
                      <TextInput
                        style={styles.input}
                        value={confirmNewPin}
                        onChangeText={setConfirmNewPin}
                        returnKeyType="done"
                        placeholder="****"
                        placeholderTextColor="#999"
                        secureTextEntry
                        keyboardType="number-pad"
                        maxLength={6}
                      />

                      <View style={styles.formButtons}>
                        <TouchableOpacity
                          style={styles.cancelButton}
                          onPress={closeResetPinModal}
                        >
                          <Text style={styles.cancelButtonText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={styles.saveButton}
                          onPress={handleResetPin}
                          disabled={loading}
                        >
                          {loading ? (
                            <ActivityIndicator color="#fff" />
                          ) : (
                            <Text style={styles.saveButtonText}>Actualizar PIN</Text>
                          )}
                        </TouchableOpacity>
                      </View>
                    </View>
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  keyboardView: {
    width: '100%',
    alignItems: 'center',
  },
  formScroll: {
    maxHeight: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  addButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  loader: {
    marginTop: 32,
  },
  list: {
    padding: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 32,
    fontSize: 16,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
  },
  userInfo: {
    marginBottom: 12,
  },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  currentBadge: {
    backgroundColor: '#E3F2FD',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  currentBadgeText: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: 'bold',
  },
  userMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  adminBadge: {
    backgroundColor: '#FFF3E0',
  },
  sellerBadge: {
    backgroundColor: '#E8F5E9',
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadge: {
    backgroundColor: '#E8F5E9',
  },
  inactiveBadge: {
    backgroundColor: '#FFEBEE',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  userActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 90,
  },
  editButton: {
    backgroundColor: '#FF9800',
  },
  toggleButton: {
    backgroundColor: '#607D8B',
  },
  resetButton: {
    backgroundColor: '#9C27B0',
  },
  deleteButton: {
    backgroundColor: '#f44336',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '90%',
    maxWidth: 500,
    maxHeight: '98%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    fontSize: 24,
    color: '#333',
    padding: 8,
  },
  form: {
    padding: 16,
    paddingBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  roleSelector: {
    flexDirection: 'row',
    gap: 12,
  },
  roleOption: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    alignItems: 'center',
  },
  roleOptionActive: {
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  roleOptionText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '600',
  },
  roleOptionTextActive: {
    color: '#2196F3',
  },
  formButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#999',
    marginRight: 12,
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

