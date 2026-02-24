import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const LoanCalculatorScreen = ({ navigation }) => {
  const [amount, setAmount] = useState('');
  const [tenure, setTenure] = useState('12'); // Months
  const [interestRate, setInterestRate] = useState('2'); // 2% per month is common in Gats
  const [result, setResult] = useState(null);

  const calculateLoan = () => {
    const p = parseFloat(amount);
    const r = parseFloat(interestRate) / 100;
    const t = parseInt(tenure);

    if (p > 0 && t > 0) {
      const totalInterest = p * r * t;
      const totalRepayment = p + totalInterest;
      const emi = totalRepayment / t;

      setResult({
        interest: totalInterest.toFixed(2),
        total: totalRepayment.toFixed(2),
        monthly: emi.toFixed(2)
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Loan Calculator</Text>
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.label}>Loan Amount (₹)</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g. 5000" 
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />

          <Text style={styles.label}>Tenure (Months)</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g. 12" 
            keyboardType="numeric"
            value={tenure}
            onChangeText={setTenure}
          />

          <Text style={styles.label}>Interest Rate (% per month)</Text>
          <TextInput 
            style={styles.input} 
            placeholder="e.g. 2" 
            keyboardType="numeric"
            value={interestRate}
            onChangeText={setInterestRate}
          />
        </View>

        <TouchableOpacity style={styles.calcButton} onPress={calculateLoan}>
          <Text style={styles.calcButtonText}>Calculate Repayment</Text>
        </TouchableOpacity>

        {result && (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Repayment Summary</Text>
            <View style={styles.resultRow}>
              <Text>Monthly EMI:</Text>
              <Text style={styles.resultValue}>₹{result.monthly}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text>Total Interest:</Text>
              <Text style={styles.resultValue}>₹{result.interest}</Text>
            </View>
            <View style={styles.resultRow}>
              <Text style={styles.bold}>Total Payable:</Text>
              <Text style={styles.totalValue}>₹{result.total}</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  scrollContent: { padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 30 },
  title: { fontSize: 22, fontWeight: 'bold', marginLeft: 15, color: '#333' },
  inputGroup: { backgroundColor: '#fff', padding: 20, borderRadius: 16, elevation: 2 },
  label: { fontSize: 14, color: '#666', marginBottom: 8, marginTop: 10 },
  input: { borderBottomWidth: 1, borderColor: '#ddd', fontSize: 18, paddingVertical: 8, color: '#333' },
  calcButton: { backgroundColor: '#2952a3', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 30 },
  calcButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  resultCard: { backgroundColor: '#eef2ff', padding: 20, borderRadius: 16, marginTop: 30, borderWidth: 1, borderColor: '#2952a3' },
  resultTitle: { fontSize: 18, fontWeight: 'bold', color: '#2952a3', marginBottom: 15 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  resultValue: { fontWeight: '600', color: '#333' },
  bold: { fontWeight: 'bold' },
  totalValue: { fontSize: 20, fontWeight: 'bold', color: '#2952a3' }
});

export default LoanCalculatorScreen;