import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import * as SecureStore from 'expo-secure-store';

const AddSavingsScreen = ({ navigation }) => {
  const [amount, setAmount] = useState('');

  const handleSave = async () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      Alert.alert("Invalid Amount", "Please enter a valid savings amount.");
      return;
    }

    try {
      const token = await SecureStore.getItemAsync('userToken');
      // Send data to Laravel
      await api.post('/savings/deposit', {
        amount: amount,
        date: new Date().toISOString().split('T')[0] // Sends today's date like "2026-02-20"
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert("Success", `₹${amount} deposited successfully!`, [
        { text: "OK", onPress: () => navigation.goBack() }
      ]);
      
    } catch (error) {
      console.error("Deposit failed:", error.response?.data || error.message);
      Alert.alert("Error", "Could not save deposit. Check network.");
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.card}>
        <View style={styles.iconContainer}>
          <Ionicons name="wallet" size={50} color="#2952a3" />
        </View>
        
        <Text style={styles.title}>Deposit Savings</Text>
        <Text style={styles.subtitle}>Enter your monthly contribution below.</Text>

        <View style={styles.inputContainer}>
          <Text style={styles.currencySymbol}>₹</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
            maxLength={6}
          />
        </View>

        <TouchableOpacity style={styles.submitButton} onPress={handleSave}>
          <Text style={styles.submitButtonText}>Submit Deposit</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: '#fff', padding: 30, borderRadius: 20, alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 5 } },
  iconContainer: { backgroundColor: '#eef2f9', padding: 20, borderRadius: 50, marginBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 30, textAlign: 'center' },
  inputContainer: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#2952a3', width: '100%', marginBottom: 40, paddingBottom: 10 },
  currencySymbol: { fontSize: 40, fontWeight: 'bold', color: '#333', marginRight: 10 },
  input: { flex: 1, fontSize: 40, fontWeight: 'bold', color: '#333' },
  submitButton: { backgroundColor: '#2952a3', width: '100%', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});

export default AddSavingsScreen;