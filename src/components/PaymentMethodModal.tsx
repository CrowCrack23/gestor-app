import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { PaymentMethod } from '../models/CashSession';
import { formatCurrency } from '../utils/formatters';

interface PaymentMethodModalProps {
  visible: boolean;
  total: number;
  onClose: () => void;
  onConfirm: (
    paymentMethod: PaymentMethod, 
    cashAmount?: number, 
    transferAmount?: number,
    receivedAmount?: number,
    changeAmount?: number
  ) => void;
}

export const PaymentMethodModal: React.FC<PaymentMethodModalProps> = ({
  visible,
  total,
  onClose,
  onConfirm,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [cashAmount, setCashAmount] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  // Estados para vuelto
  const [receivedAmount, setReceivedAmount] = useState('');
  const [changeAmount, setChangeAmount] = useState(0);
  const [isInsufficientAmount, setIsInsufficientAmount] = useState(false);

  useEffect(() => {
    if (visible) {
      // Reset al abrir modal
      setSelectedMethod(null);
      setCashAmount('');
      setTransferAmount('');
      setReceivedAmount('');
      setChangeAmount(0);
      setIsInsufficientAmount(false);
    }
  }, [visible]);

  useEffect(() => {
    // Auto-calcular transferencia cuando cambia efectivo en pago mixto
    if (selectedMethod === 'mixed' && cashAmount) {
      const cash = parseFloat(cashAmount) || 0;
      const transfer = Math.max(0, total - cash);
      setTransferAmount(transfer.toFixed(2));
    }
  }, [cashAmount, selectedMethod, total]);

  useEffect(() => {
    // Calcular vuelto para pagos en efectivo
    if (selectedMethod === 'cash' && receivedAmount) {
      const received = parseFloat(receivedAmount) || 0;
      const change = received - total;
      setChangeAmount(Math.max(0, change));
      setIsInsufficientAmount(received < total);
    } else if (selectedMethod === 'cash') {
      setChangeAmount(0);
      setIsInsufficientAmount(false);
    }
  }, [receivedAmount, total, selectedMethod]);

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    
    if (method === 'cash') {
      setCashAmount(total.toFixed(2));
      setTransferAmount('0');
      setReceivedAmount(''); // Para que el usuario ingrese el monto recibido
      setChangeAmount(0);
      setIsInsufficientAmount(false);
    } else if (method === 'transfer') {
      setCashAmount('0');
      setTransferAmount(total.toFixed(2));
      setReceivedAmount('');
      setChangeAmount(0);
      setIsInsufficientAmount(false);
    } else if (method === 'mixed') {
      setCashAmount('');
      setTransferAmount('');
      setReceivedAmount('');
      setChangeAmount(0);
      setIsInsufficientAmount(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedMethod) {
      Alert.alert('Error', 'Selecciona un método de pago');
      return;
    }

    if (selectedMethod === 'cash') {
      // Validación para pagos en efectivo con vuelto
      if (!receivedAmount || receivedAmount.trim() === '') {
        Alert.alert('Error', 'Ingresa el monto recibido');
        return;
      }
      
      const received = parseFloat(receivedAmount) || 0;
      if (received < total) {
        Alert.alert('Error', 'El monto recibido es insuficiente');
        return;
      }
      
      onConfirm(selectedMethod, undefined, undefined, received, changeAmount);
    } else if (selectedMethod === 'mixed') {
      const cash = parseFloat(cashAmount) || 0;
      const transfer = parseFloat(transferAmount) || 0;
      
      if (cash <= 0 && transfer <= 0) {
        Alert.alert('Error', 'Ingresa al menos un monto mayor a 0');
        return;
      }
      
      if (Math.abs((cash + transfer) - total) > 0.01) {
        Alert.alert(
          'Error', 
          `La suma de efectivo y transferencia debe ser igual al total: ${formatCurrency(total)}`
        );
        return;
      }
      
      onConfirm(selectedMethod, cash, transfer);
    } else {
      onConfirm(selectedMethod);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>Método de Pago</Text>
            <Text style={styles.totalText}>Total: {formatCurrency(total)}</Text>
          </View>

          <View style={styles.methodsContainer}>
            <TouchableOpacity
              style={[
                styles.methodButton,
                selectedMethod === 'cash' && styles.methodButtonSelected
              ]}
              onPress={() => handleMethodSelect('cash')}
            >
              <Text style={styles.methodIcon}>💵</Text>
              <Text style={[
                styles.methodText,
                selectedMethod === 'cash' && styles.methodTextSelected
              ]}>
                Efectivo
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.methodButton,
                selectedMethod === 'transfer' && styles.methodButtonSelected
              ]}
              onPress={() => handleMethodSelect('transfer')}
            >
              <Text style={styles.methodIcon}>📱</Text>
              <Text style={[
                styles.methodText,
                selectedMethod === 'transfer' && styles.methodTextSelected
              ]}>
                Transferencia
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.methodButton,
                selectedMethod === 'mixed' && styles.methodButtonSelected
              ]}
              onPress={() => handleMethodSelect('mixed')}
            >
              <Text style={styles.methodIcon}>💰</Text>
              <Text style={[
                styles.methodText,
                selectedMethod === 'mixed' && styles.methodTextSelected
              ]}>
                Mixto
              </Text>
            </TouchableOpacity>
          </View>

          {selectedMethod === 'cash' && (
            <View style={styles.cashPaymentContainer}>
              <Text style={styles.cashTitle}>Pago en Efectivo:</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>💵 Monto Recibido:</Text>
                <TextInput
                  style={[
                    styles.input,
                    isInsufficientAmount && styles.inputError
                  ]}
                  value={receivedAmount}
                  onChangeText={setReceivedAmount}
                  placeholder={total.toFixed(2)}
                  keyboardType="decimal-pad"
                  returnKeyType="done"
                  autoFocus
                />
              </View>

              {receivedAmount && (
                <View style={[
                  styles.changeContainer,
                  isInsufficientAmount ? styles.changeContainerError : styles.changeContainerSuccess
                ]}>
                  {isInsufficientAmount ? (
                    <Text style={styles.changeTextError}>
                      ❌ Monto insuficiente: Faltan {formatCurrency(total - (parseFloat(receivedAmount) || 0))}
                    </Text>
                  ) : changeAmount > 0 ? (
                    <Text style={styles.changeTextSuccess}>
                      💰 Vuelto: {formatCurrency(changeAmount)}
                    </Text>
                  ) : (
                    <Text style={styles.changeTextExact}>
                      ✅ Monto exacto
                    </Text>
                  )}
                </View>
              )}
            </View>
          )}

          {selectedMethod === 'mixed' && (
            <View style={styles.mixedPaymentContainer}>
              <Text style={styles.mixedTitle}>Dividir Pago:</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>💵 Efectivo:</Text>
                <TextInput
                  style={styles.input}
                  value={cashAmount}
                  onChangeText={setCashAmount}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                  returnKeyType="next"
                  autoFocus
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>📱 Transferencia:</Text>
                <TextInput
                  style={[styles.input, styles.inputReadonly]}
                  value={transferAmount}
                  editable={false}
                  placeholder="0.00"
                />
              </View>

              <View style={styles.summaryContainer}>
                <Text style={styles.summaryText}>
                  Suma: {formatCurrency((parseFloat(cashAmount) || 0) + (parseFloat(transferAmount) || 0))}
                </Text>
                <Text style={styles.summaryText}>
                  Total: {formatCurrency(total)}
                </Text>
              </View>
            </View>
          )}

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onClose}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                (!selectedMethod || isInsufficientAmount) && styles.confirmButtonDisabled
              ]}
              onPress={handleConfirm}
              disabled={!selectedMethod || isInsufficientAmount}
            >
              <Text style={styles.confirmButtonText}>Confirmar Pago</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    width: '85%',
    maxWidth: 350,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  totalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2196F3',
  },
  methodsContainer: {
    marginBottom: 20,
  },
  methodButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    marginBottom: 8,
    backgroundColor: '#F9F9F9',
  },
  methodButtonSelected: {
    borderColor: '#2196F3',
    backgroundColor: '#E3F2FD',
  },
  methodIcon: {
    fontSize: 20,
    marginRight: 10,
  },
  methodText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  methodTextSelected: {
    color: '#2196F3',
  },
  cashPaymentContainer: {
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  cashTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  inputError: {
    borderColor: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  changeContainer: {
    padding: 10,
    borderRadius: 6,
    marginTop: 8,
    alignItems: 'center',
  },
  changeContainerSuccess: {
    backgroundColor: '#E8F5E8',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  changeContainerError: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
    borderWidth: 1,
  },
  changeTextSuccess: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  changeTextError: {
    fontSize: 14,
    fontWeight: '600',
    color: '#C62828',
  },
  changeTextExact: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
  },
  mixedPaymentContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  mixedTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    backgroundColor: '#FFF',
  },
  inputReadonly: {
    backgroundColor: '#F0F0F0',
    color: '#666',
  },
  summaryContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#E3F2FD',
    borderRadius: 6,
  },
  summaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1976D2',
    marginBottom: 2,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
    marginRight: 6,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  confirmButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#2196F3',
    marginLeft: 6,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    backgroundColor: '#CCC',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFF',
  },
});