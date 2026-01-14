import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import * as db from '../services/database';
import { useAuth } from '../auth/AuthContext';
import { formatCurrency } from '../utils/formatters';

interface CashOpenScreenProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CashOpenScreen: React.FC<CashOpenScreenProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const [openingCash, setOpeningCash] = useState('');
  const [loading, setLoading] = useState(false);
  const { currentUser } = useAuth();

  const handleOpenCash = async () => {
    const amount = parseFloat(openingCash);
    
    if (isNaN(amount) || amount < 0) {
      Alert.alert('Error', 'Ingresa un monto válido');
      return;
    }

    try {
      setLoading(true);
      
      await db.openCashSession(amount, currentUser!.id!);
      
      Alert.alert(
        'Caja Abierta',
        `Caja abierta con ${formatCurrency(amount)}\n¡Listo para vender!`,
        [{ text: 'OK', onPress: () => { onSuccess(); onClose(); } }]
      );
      
      setOpeningCash('');
    } catch (error: any) {
      console.error('Error al abrir caja:', error);
      Alert.alert('Error', error.message || 'No se pudo abrir la caja');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.icon}>💰</Text>
            <Text style={styles.title}>Apertura de Caja</Text>
            <Text style={styles.subtitle}>
              Ingresa el fondo inicial para abrir la caja
            </Text>
          </View>

          <View style={styles.form}>
            <Text style={styles.label}>Fondo Inicial (Efectivo)</Text>
            <TextInput
              style={styles.input}
              value={openingCash}
              onChangeText={setOpeningCash}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor="#999"
              editable={!loading}
            />

            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                💡 Este es el dinero en efectivo con el que inicias tu turno.
              </Text>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={onClose}
                disabled={loading}
              >
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.openButton, loading && styles.buttonDisabled]}
                onPress={handleOpenCash}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.openButtonText}>Abrir Caja</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    maxWidth: 400,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  icon: {
    fontSize: 64,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  form: {},
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 14,
    fontSize: 18,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    color: '#333',
    fontWeight: 'bold',
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  infoText: {
    fontSize: 13,
    color: '#1976D2',
    lineHeight: 18,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#999',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
  openButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 2,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  openButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

