import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import api from '../services/api';

const DashboardScreen = ({ navigation }) => {
const [userData, setUserData] = useState(null);
const [totalSavings, setTotalSavings] = useState(0);
const [recentTransactions, setRecentTransactions] = useState([]); // NEW: Memory for the list
const [loading, setLoading] = useState(true);

useFocusEffect(
useCallback(() => {
const fetchData = async () => {
try {
const token = await SecureStore.getItemAsync('userToken');

<<<<<<< HEAD
        // 3. Save the real data!
        setUserData(response.data);
      } catch (error) {
        console.error("Failed to fetch user:", error();
        );
      } finally {
        setLoading(false);
      }
    };
=======
      const userResponse = await api.get('/user', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserData(userResponse.data);
>>>>>>> dab1ef19837fdccbcccb7806382deafb47ab542e

      const statsResponse = await api.get('/user/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setTotalSavings(statsResponse.data.total_savings);
      // NEW: Save the transactions we got from Laravel
      setRecentTransactions(statsResponse.data.recent_transactions || []);

    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  fetchData();
}, [])
);

const handleLogout = async () => {
await SecureStore.deleteItemAsync('userToken');
navigation.replace('Login');
};

if (loading) {
return (
<View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
<ActivityIndicator size="large" color="#2952a3" />
<Text style={{marginTop: 10, color: '#888'}}>Loading your account...</Text>
</View>
);
}

return (
<ScrollView style={styles.container}>
{/* Header Section */}
<View style={styles.header}>
<View>
<Text style={styles.greeting}>Hello, {userData?.name || "Member"} 👋</Text>
<Text style={styles.groupName}>Bharat Bachat</Text>
</View>
<TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
<Ionicons name="log-out-outline" size={28} color="#dc3545" />
</TouchableOpacity>
</View>

  {/* Financial Summary Cards */}
  <View style={styles.cardsContainer}>
    <View style={[styles.card, styles.savingsCard]}>
      <Ionicons name="wallet" size={32} color="#fff" />
      <Text style={styles.cardLabel}>Total Savings</Text>
      <Text style={styles.cardValue}>₹{totalSavings}</Text>
    </View>

    <View style={[styles.card, styles.loanCard]}>
      <MaterialCommunityIcons name="cash-remove" size={32} color="#fff" />
      <Text style={styles.cardLabel}>Active Loan</Text>
      <Text style={styles.cardValue}>₹5,000</Text>
    </View>
  </View>

  {/* Group Info Section */}
  <View style={styles.infoSection}>
    <Text style={styles.sectionTitle}>Group Details</Text>
    <View style={styles.infoRow}>
      <Ionicons name="calendar" size={24} color="#2952a3" />
      <Text style={styles.infoText}>Next Meeting: <Text style={styles.boldText}>10th March</Text></Text>
    </View>
  </View>

  {/* Quick Actions */}
  <Text style={styles.sectionTitle}>Quick Actions</Text>
  <View style={styles.actionGrid}>
    <TouchableOpacity 
      style={styles.actionButton} 
      onPress={() => navigation.navigate('AddSavings')}
    >
      <View style={styles.iconCircle}>
        <Ionicons name="add-circle-outline" size={30} color="#2952a3" />
      </View>
      <Text style={styles.actionText}>Add</Text>
    </TouchableOpacity>
    
    <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Members')}>
      <View style={styles.iconCircle}>
        <Ionicons name="people-outline" size={30} color="#2952a3" />
      </View>
      <Text style={styles.actionText}>Members</Text>
    </TouchableOpacity>

    <View style={styles.actionButton} /> 
  </View>

  {/* NEW: Recent Transactions Section */}
  <Text style={styles.sectionTitle}>Recent Transactions</Text>
  <View style={styles.transactionsContainer}>
    {recentTransactions.length > 0 ? (
      recentTransactions.map((tx, index) => (
        <View key={index} style={styles.transactionItem}>
          <View style={styles.transactionIcon}>
            <Ionicons name="arrow-down-circle" size={28} color="#28a745" />
          </View>
          <View style={styles.transactionDetails}>
            <Text style={styles.transactionType}>Deposit</Text>
            <Text style={styles.transactionDate}>
              {new Date(tx.transaction_date).toDateString()}
            </Text>
          </View>
          <Text style={styles.transactionAmount}>+₹{tx.amount}</Text>
        </View>
      ))
    ) : (
      <Text style={styles.noTransactionsText}>No recent transactions yet.</Text>
    )}
  </View>

  {/* Adds a little space at the very bottom so we can scroll smoothly */}
  <View style={{ height: 40 }} />
</ScrollView>
);
};

const styles = StyleSheet.create({
<<<<<<< HEAD
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: '#fff' },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  groupName: { fontSize: 16, color: '#888', marginTop: 4 },
  logoutButton: { padding: 8, backgroundColor: '#ffe6e6', borderRadius: 12 },
  cardsContainer: { flexDirection: 'row', padding: 20, justifyContent: 'space-between' },
  card: { flex: 1, padding: 20, borderRadius: 16, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  savingsCard: { backgroundColor: '#2952a3', marginRight: 10 },
  loanCard: { backgroundColor: '#e67e22', marginLeft: 10 },
  cardLabel: { color: 'rgb(251, 251, 251)', fontSize: 14, marginTop: 12, marginBottom: 4 },
  cardValue: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
  infoSection: { backgroundColor: '#fff', margin: 20, padding: 20, borderRadius: 16, marginTop: 0 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 16, marginLeft: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  infoText: { fontSize: 16, color: '#555', marginLeft: 12 },
  boldText: { fontWeight: 'bold', color: '#333' },
  actionGrid: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 10, paddingBottom: 40 },
  actionButton: { alignItems: 'center', flex: 1 },
  iconCircle: { backgroundColor: '#eef2f9', padding: 15, borderRadius: 50, marginBottom: 8 },
  actionText: { fontSize: 14, color: '#555', fontWeight: '500' }
=======
container: { flex: 1, backgroundColor: '#f4f6f8' },
header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 24, paddingTop: 60, backgroundColor: '#fff' },
greeting: { fontSize: 24, fontWeight: 'bold', color: '#333' },
groupName: { fontSize: 16, color: '#888', marginTop: 4 },
logoutButton: { padding: 8, backgroundColor: '#ffe6e6', borderRadius: 12 },
cardsContainer: { flexDirection: 'row', padding: 20, justifyContent: 'space-between' },
card: { flex: 1, padding: 20, borderRadius: 16, elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
savingsCard: { backgroundColor: '#2952a3', marginRight: 10 },
loanCard: { backgroundColor: '#e67e22', marginLeft: 10 },
cardLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 12, marginBottom: 4 },
cardValue: { color: '#fff', fontSize: 22, fontWeight: 'bold' },
infoSection: { backgroundColor: '#fff', margin: 20, padding: 20, borderRadius: 16, marginTop: 0 },
sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 16, marginLeft: 20 },
infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
infoText: { fontSize: 16, color: '#555', marginLeft: 12 },
boldText: { fontWeight: 'bold', color: '#333' },
actionGrid: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 10, paddingBottom: 20 },
actionButton: { alignItems: 'center', flex: 1 },
iconCircle: { backgroundColor: '#eef2f9', padding: 15, borderRadius: 50, marginBottom: 8 },
actionText: { fontSize: 14, color: '#555', fontWeight: '500' },

// NEW STYLES FOR TRANSACTIONS
transactionsContainer: { backgroundColor: '#fff', marginHorizontal: 20, borderRadius: 16, padding: 10 },
transactionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
transactionIcon: { marginRight: 15 },
transactionDetails: { flex: 1 },
transactionType: { fontSize: 16, fontWeight: 'bold', color: '#333' },
transactionDate: { fontSize: 12, color: '#888', marginTop: 2 },
transactionAmount: { fontSize: 16, fontWeight: 'bold', color: '#28a745' },
noTransactionsText: { textAlign: 'center', color: '#888', padding: 20 }
>>>>>>> dab1ef19837fdccbcccb7806382deafb47ab542e
});

export default DashboardScreen;