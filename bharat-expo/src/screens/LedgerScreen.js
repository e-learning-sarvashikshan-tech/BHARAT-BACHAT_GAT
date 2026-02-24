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
import { getLocalTransactions } from '../services/database'; // NEW: SQLite helper

const LedgerScreen = ({ navigation }) => {
  const [transactions, setTransactions] = useState([]);
  const [totalBalance, setTotalBalance] = useState(0);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      const loadLedgerData = async () => {
        setLoading(true);
        try {
          // 1. First, fetch all local transactions from SQLite
          const localData = await getLocalTransactions();
          
          // 2. Try to fetch fresh data from Kunal's API
          let apiData = [];
          try {
            const response = await api.get('/user/transactions');
            apiData = response.data.transactions || [];
          } catch (apiError) {
            console.log("API Offline or 404: Showing local data only.");
          }

          // 3. Merge both (Unique items only)
          // In a real app, you'd match IDs, but for now, we'll favor API data
          const combined = apiData.length > 0 ? apiData : localData;
          
          setTransactions(combined);
          
          // Calculate balance from the displayed list
          const balance = combined.reduce((acc, item) => acc + item.amount, 0);
          setTotalBalance(balance);

        } catch (error) {
          console.error("Ledger Load Error:", error);
        } finally {
          setLoading(false);
        }
      };

      loadLedgerData();
    }, [])
  );

  const renderTransaction = ({ item }) => {
    const isDeposit = item.type === 'deposit';
    const isSynced = item.synced === 1 || !item.hasOwnProperty('synced');
    
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
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.transactionTitle}>
              {isDeposit ? 'Monthly Saving' : 'Loan Disbursement'}
            </Text>
            {!isSynced && (
              <View style={styles.localBadge}>
                <Text style={styles.localBadgeText}>Local</Text>
              </View>
            )}
          </View>
          <Text style={styles.transactionDate}>
            {new Date(item.date).toLocaleDateString()} • {item.method || 'Cash'}
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
        <Text style={styles.loadingText}>Reading Passbook...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.headerCard}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerSubtitle}>Total Contribution</Text>
        <Text style={styles.headerBalance}>₹{totalBalance}</Text>
      </View>

      <View style={styles.listContainer}>
        <Text style={styles.sectionTitle}>Transaction History</Text>
        <FlatList
          data={transactions}
          keyExtractor={(item, index) => (item.id ? item.id.toString() : index.toString())}
          renderItem={renderTransaction}
          contentContainerStyle={styles.flatListContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={60} color="#ccc" />
              <Text style={styles.emptyText}>No transactions found.</Text>
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
  transactionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 16, marginBottom: 12, elevation: 2 },
  iconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  transactionDetails: { flex: 1 },
  transactionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  transactionDate: { fontSize: 13, color: '#888', marginTop: 4 },
  transactionAmount: { fontSize: 18, fontWeight: 'bold' },
  localBadge: { backgroundColor: '#fff3e0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8, borderWidth: 1, borderColor: '#ffe0b2' },
  localBadgeText: { fontSize: 10, color: '#e65100', fontWeight: 'bold', textTransform: 'uppercase' },
  emptyContainer: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#888', fontSize: 16, marginTop: 10 }
});

export default LedgerScreen;