import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

const EditTransactionScreen = ({ route, navigation }) => {
  // Grab the transaction data passed from the Dashboard/Ledger
  const { transactionData } = route.params;

  const [amount, setAmount] = useState(transactionData.amount.toString());
  const [method, setMethod] = useState(transactionData.method || 'Cash');

  const handleUpdate = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      
      await api.put(`/transactions/${transactionData.id}`, {
        amount: parseFloat(amount),
        method: method
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert("Success", "Transaction updated!");
      navigation.goBack(); // Send them back to the dashboard
    } catch (error) {
      console.error("Update failed:", error.response?.data || error.message);
      Alert.alert("Error", "Could not update transaction.");
    }
  };

  return (
    <View style={styles.container}>
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

      <TouchableOpacity style={styles.button} onPress={handleUpdate}>
        <Text style={styles.buttonText}>Save Changes</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f4f6f8' },
  label: { fontSize: 16, fontWeight: 'bold', marginBottom: 8, marginTop: 20 },
  input: { backgroundColor: '#fff', padding: 15, borderRadius: 8, fontSize: 16, borderWidth: 1, borderColor: '#ddd' },
  button: { backgroundColor: '#2952a3', padding: 15, borderRadius: 8, alignItems: 'center', marginTop: 30 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});

export default EditTransactionScreen;