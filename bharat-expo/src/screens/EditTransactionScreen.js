import React, { useState } from 'react';
import { useTranslation } from 'react-i18next'; // <-- ADDED
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

const EditTransactionScreen = ({ route, navigation }) => {
  const { t } = useTranslation(); // <-- ADDED
  const { transactionData } = route.params;

  const [amount, setAmount] = useState(transactionData.amount.toString());
  const [method, setMethod] = useState(transactionData.method || 'Cash');
  const [editReason, setEditReason] = useState(''); // <-- NEW STATE
  const [loading, setLoading] = useState(false);

  const handleUpdate = async () => {
    if (!editReason.trim()) {
        return Alert.alert(t('common.warning', "Validation Error"), t('alerts.editReasonRequired', "You must provide a reason for editing this financial record."));
    }

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      
      await api.put(`/transactions/${transactionData.id}`, {
        amount: parseFloat(amount),
        method: method,
        edit_reason: editReason // <-- SENDING TO BACKEND
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert(t('common.success', "Success"), t('alerts.editSuccess', "Transaction updated and securely logged."));
      navigation.goBack(); 
    } catch (error) {
      console.error("Update failed:", error.response?.data || error.message);
      Alert.alert(t('common.error', "Error"), error.response?.data?.message || t('alerts.editFailed', "Could not update transaction."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Secure Edit Mode</Text>
      <Text style={styles.subText}>All edits are permanently tracked in the group audit log.</Text>

      <Text style={styles.label}>Edit Amount (₹)</Text>
      <TextInput 
        style={styles.input} 
        value={amount} 
        onChangeText={setAmount} 
        keyboardType="numeric" 
      />

      <Text style={styles.label}>Payment Method</Text>
      <TextInput 
        style={styles.input} 
        value={method} 
        onChangeText={setMethod} 
      />

      {/* NEW AUDIT REASON INPUT */}
      <Text style={[styles.label, { color: '#e67e22' }]}>Reason for Edit (Required)</Text>
      <TextInput 
        style={[styles.input, { borderColor: '#e67e22', height: 80 }]} 
        value={editReason} 
        onChangeText={setEditReason} 
        placeholder="e.g., Typed 500 instead of 5000"
        multiline
      />

      <TouchableOpacity style={styles.button} onPress={handleUpdate} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Save & Log Edit</Text>}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f4f6f8' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', marginTop: 10 },
  subText: { fontSize: 13, color: '#666', marginBottom: 20, marginTop: 5 },
  label: { fontSize: 15, fontWeight: 'bold', marginBottom: 8, marginTop: 15, color: '#333' },
  input: { backgroundColor: '#fff', padding: 15, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: '#ddd' },
  button: { backgroundColor: '#2952a3', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 30 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});

export default EditTransactionScreen;