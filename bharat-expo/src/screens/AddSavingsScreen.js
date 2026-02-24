import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { saveTransaction } from '../services/database'; // NEW: Import local storage helper

const AddSavingsScreen = ({ navigation }) => {
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('UPI'); 
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);

  // Get the current user ID when the screen loads
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        const response = await api.get('/user', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUserId(response.data.id);
      } catch (error) {
        console.error("Could not fetch user ID for transaction", error);
      }
    };
    fetchUser();
  }, []);

  const handleDeposit = async () => {
    // 1. Validate the input
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid deposit amount.');
      return;
    }

    setLoading(true);

    try {
      // 2. NEW: ALWAYS save to SQLite first (Offline Safety)
      // This ensures the data is safe even if the network fails
      const localSaveSuccessful = await saveTransaction(
        userId, 
        'deposit', 
        Number(amount), 
        paymentMethod
      );

      if (!localSaveSuccessful) {
        throw new Error("Local database save failed");
      }

      // 3. Try to sync with Kunal's API
      try {
        await api.post('/transactions/deposit', {
          amount: Number(amount),
          method: paymentMethod,
          type: 'deposit'
        });
        
        Alert.alert('Success', 'Your savings have been recorded and synced!');
      } catch (apiError) {
        // If API fails, we don't treat it as a total failure because SQLite worked!
        Alert.alert(
          'Saved Locally', 
          'Recorded in your local Passbook. It will sync to the server when you have internet.'
        );
      }

      navigation.goBack();

    } catch (error) {
      Alert.alert('Error', 'Could not save transaction. Please try again.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="wallet-outline" size={40} color="#2952a3" />
            </View>
            <Text style={styles.title}>Add Monthly Savings</Text>
            <Text style={styles.subtitle}>Enter the amount you are depositing into the Gat.</Text>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.currencySymbol}>₹</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              keyboardType="numeric" 
              value={amount}
              onChangeText={setAmount}
              maxLength={6}
            />
          </View>

          <Text style={styles.label}>Payment Method</Text>
          <View style={styles.methodContainer}>
            <TouchableOpacity 
              style={[styles.methodOption, paymentMethod === 'Cash' && styles.methodSelected]}
              onPress={() => setPaymentMethod('Cash')}
            >
              <Ionicons name="cash-outline" size={24} color={paymentMethod === 'Cash' ? '#2952a3' : '#888'} />
              <Text style={[styles.methodText, paymentMethod === 'Cash' && styles.methodTextSelected]}>Cash</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.methodOption, paymentMethod === 'UPI' && styles.methodSelected]}
              onPress={() => setPaymentMethod('UPI')}
            >
              <Ionicons name="phone-portrait-outline" size={24} color={paymentMethod === 'UPI' ? '#2952a3' : '#888'} />
              <Text style={[styles.methodText, paymentMethod === 'UPI' && styles.methodTextSelected]}>UPI</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={[styles.submitButton, loading && styles.buttonDisabled]} 
            onPress={handleDeposit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitButtonText}>Confirm Deposit</Text>
            )}
          </TouchableOpacity>

        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  keyboardView: { flex: 1 },
  content: { flex: 1, padding: 20, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 40 },
  iconCircle: { backgroundColor: '#eef2ff', padding: 20, borderRadius: 50, marginBottom: 15 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  subtitle: { fontSize: 14, color: '#666', marginTop: 5, textAlign: 'center' },
  
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 10, marginBottom: 30, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  currencySymbol: { fontSize: 40, fontWeight: 'bold', color: '#2952a3', marginRight: 10 },
  amountInput: { flex: 1, fontSize: 40, fontWeight: 'bold', color: '#333', paddingVertical: 10 },
  
  label: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 10, marginLeft: 5 },
  methodContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 40 },
  methodOption: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginHorizontal: 5, borderWidth: 1, borderColor: '#ddd' },
  methodSelected: { borderColor: '#2952a3', backgroundColor: '#eef2ff' },
  methodText: { fontSize: 16, color: '#888', marginLeft: 8, fontWeight: '500' },
  methodTextSelected: { color: '#2952a3', fontWeight: 'bold' },
  
  submitButton: { backgroundColor: '#28a745', padding: 18, borderRadius: 12, alignItems: 'center', elevation: 3, shadowColor: '#28a745', shadowOpacity: 0.3, shadowRadius: 5, shadowOffset: { width: 0, height: 3 } },
  buttonDisabled: { backgroundColor: '#a5d6a7' },
  submitButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});

export default AddSavingsScreen;