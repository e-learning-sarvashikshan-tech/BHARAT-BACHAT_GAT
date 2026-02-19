import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../services/api'; // <--- We import our API tool

const DashboardScreen = ({ navigation }) => {
  // We set up a state variable to hold the real user data
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  // This runs the moment the Dashboard opens
  useEffect(() => {
    const fetchRealUser = async () => {
      try {
        // 1. Get the locked token from the vault
        const token = await SecureStore.getItemAsync('userToken');
        
        // 2. Knock on Laravel's /user door and show the token
        const response = await api.get('/user', {
          headers: { Authorization: `Bearer ${token}` }
        });

        // 3. Save the real data!
        setUserData(response.data);
      } catch (error) {
        console.error("Failed to fetch user:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchRealUser();
  }, []);

  const handleLogout = async () => {
    await SecureStore.deleteItemAsync('userToken');
    navigation.replace('Login');
  };

  // Show a loading spinner while waiting for Laravel
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
          {/* We now use the REAL name from the database! */}
          <Text style={styles.greeting}>Hello, {userData?.name || "Member"} 👋</Text>
          <Text style={styles.groupName}>Bharat Bachat</Text>
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={28} color="#dc3545" />
        </TouchableOpacity>
      </View>

      {/* Financial Summary Cards (Still mock numbers for now until we build the savings table) */}
      <View style={styles.cardsContainer}>
        <View style={[styles.card, styles.savingsCard]}>
          <Ionicons name="wallet" size={32} color="#fff" />
          <Text style={styles.cardLabel}>Total Savings</Text>
          <Text style={styles.cardValue}>₹12,500</Text>
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
        <TouchableOpacity style={styles.actionButton}>
          <View style={styles.iconCircle}>
            <Ionicons name="add-circle-outline" size={30} color="#2952a3" />
          </View>
          <Text style={styles.actionText}>Add Savings</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('Members')}>
          <View style={styles.iconCircle}>
            <Ionicons name="people-outline" size={30} color="#2952a3" />
          </View>
          <Text style={styles.actionText}>Members</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

// ... [Keep your exact same styles from before down here]
const styles = StyleSheet.create({
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
  actionGrid: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 10, paddingBottom: 40 },
  actionButton: { alignItems: 'center', flex: 1 },
  iconCircle: { backgroundColor: '#eef2f9', padding: 15, borderRadius: 50, marginBottom: 8 },
  actionText: { fontSize: 14, color: '#555', fontWeight: '500' }
});

export default DashboardScreen;