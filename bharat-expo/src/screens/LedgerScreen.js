import React, { useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  ActivityIndicator,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';

const LedgerScreen = ({ navigation }) => {
  const [transactions, setTransactions] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const fetchLedger = async () => {
        setLoading(true);
        try {
          // Fetching the transaction history from the backend
          const response = await api.get('/user/transactions');
          setTransactions(response.data.transactions || []);
          setTotalBalance(response.data.total_balance || 0);
        } catch (error) {
          console.error("Failed to fetch ledger:", error);
          // Fallback dummy data for UI testing if API isn't ready
          if (transactions.length === 0) {
            setTotalBalance(1500);
            setTransactions([
              { id: 1, type: 'deposit', amount: 500, date: '2026-02-20T10:30:00Z', method: 'UPI' },
              { id: 2, type: 'deposit', amount: 1000, date: '2026-01-20T14:15:00Z', method: 'Cash' }
            ]);
          }
        } finally {
          setLoading(false);
        }
      };

      fetchLedger();
    }, [])
  );

  const renderTransaction = ({ item }) => {
    const isDeposit = item.type === 'deposit';
    
    return (
      <View style={styles.transactionCard}>
        <View style={[styles.iconBox, { backgroundColor: isDeposit ? '#e8f5e9' : '#ffebee' }]}>
          <Ionicons 
            name={isDeposit ? "arrow-down-outline" : "arrow-up-outline"} 
            size={24} 
            color={isDeposit ? "#2e7d32" : "#c62828"} 
          />
        </View>
        
        <View style={styles.transactionDetails}>
          <Text style={styles.transactionTitle}>
            {isDeposit ? 'Monthly Saving' : 'Loan Disbursement'}
          </Text>
          <Text style={styles.transactionDate}>
            {new Date(item.date).toLocaleDateString()} • {item.method || 'Transfer'}
          </Text>
        </View>

        <Text style={[styles.transactionAmount, { color: isDeposit ? '#2e7d32' : '#c62828' }]}>
          {isDeposit ? '+' : '-'}₹{item.amount}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2952a3" />
        <Text style={styles.loadingText}>Loading your Passbook...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header / Balance Card */}
      <View style={styles.headerCard}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerSubtitle}>Total Contributed Balance</Text>
        <Text style={styles.headerBalance}>₹{totalBalance}</Text>
      </View>

      {/* Transactions List */}
      <View style={styles.listContainer}>
        <Text style={styles.sectionTitle}>Transaction History</Text>
        
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderTransaction}
          contentContainerStyle={styles.flatListContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No transactions yet.</Text>
            </View>
          }
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2952a3' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f6f8' },
  loadingText: { marginTop: 10, color: '#888', fontSize: 16 },
  
  headerCard: { padding: 25, paddingTop: 10, paddingBottom: 35, alignItems: 'center' },
  backButton: { position: 'absolute', left: 20, top: 10, padding: 5 },
  headerSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1, marginTop: 10 },
  headerBalance: { color: '#fff', fontSize: 40, fontWeight: 'bold', marginTop: 5 },
  
  listContainer: { flex: 1, backgroundColor: '#f4f6f8', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingHorizontal: 20, paddingTop: 25 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 15 },
  flatListContent: { paddingBottom: 30 },
  
  transactionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  iconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  transactionDetails: { flex: 1 },
  transactionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  transactionDate: { fontSize: 13, color: '#888', marginTop: 4 },
  transactionAmount: { fontSize: 18, fontWeight: 'bold' },
  
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#888', fontSize: 16, marginTop: 10 }
});

export default LedgerScreen;