import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { db } from '../services/database'; 

// Correct libraries installed
import ViewShot from "react-native-view-shot";
import * as Sharing from 'expo-sharing';

const ProfileScreen = ({ navigation }) => {
  const [profile, setProfile] = useState(null);
  const [realSavings, setRealSavings] = useState(0);
  const [loading, setLoading] = useState(true);
  const viewShotRef = useRef(); 

  useEffect(() => {
    const loadProfileAndStats = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        const response = await api.get('/user', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProfile(response.data);

        // Fetch actual savings from SQLite
        db.transaction(tx => {
          tx.executeSql(
            'SELECT SUM(amount) as total FROM transactions',
            [],
            (_, { rows }) => {
              const total = rows.item(0).total || 0;
              setRealSavings(total);
            },
            (_, error) => console.log("SQLite Error: ", error)
          );
        });
      } catch (error) {
        console.error("Profile Data Error:", error);
      } finally {
        setLoading(false);
      }
    };
    loadProfileAndStats();
  }, []);

  // Function to capture and share
  const shareStatus = async () => {
    try {
      const uri = await viewShotRef.current.capture();
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          dialogTitle: 'Share my Bharat Bachat Status',
          mimeType: 'image/jpeg',
        });
      } else {
        Alert.alert("Error", "Sharing is not available on this device");
      }
    } catch (error) {
      console.error("Sharing error:", error);
      Alert.alert("Error", "Failed to capture screen for sharing");
    }
  };

  if (loading) return <ActivityIndicator style={{flex:1}} size="large" color="#2952a3" />;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
          <TouchableOpacity onPress={shareStatus}>
            <Ionicons name="share-social-outline" size={24} color="#2952a3" />
          </TouchableOpacity>
        </View>

        {/* Capture this area as an image */}
        <ViewShot ref={viewShotRef} options={{ format: "jpg", quality: 0.9 }}>
          <View style={styles.profileCard}>
            <View style={styles.avatarContainer}>
              <Text style={styles.avatarText}>{profile?.name?.charAt(0) || 'U'}</Text>
            </View>
            <Text style={styles.userName}>{profile?.name || "Member"}</Text>
            <Text style={styles.userEmail}>{profile?.email || "No Email"}</Text>
            
            <View style={styles.shareBadge}>
              <Text style={styles.shareBadgeTitle}>Bharat Bachat Summary</Text>
              <Text style={styles.shareAmount}>Total Savings: ₹{realSavings}</Text>
              <Text style={styles.shareDate}>Dated: {new Date().toLocaleDateString()}</Text>
            </View>
          </View>
        </ViewShot>

        <TouchableOpacity style={styles.whatsappButton} onPress={shareStatus}>
          <Ionicons name="logo-whatsapp" size={20} color="#fff" style={{marginRight: 10}} />
          <Text style={styles.whatsappButtonText}>Share on WhatsApp</Text>
        </TouchableOpacity>

        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Ledger')}>
            <Ionicons name="list-outline" size={24} color="#2952a3" />
            <Text style={styles.menuText}>Transaction History</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Attendance')}>
            <Ionicons name="calendar-outline" size={24} color="#2952a3" />
            <Text style={styles.menuText}>Attendance History</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  profileCard: { alignItems: 'center', backgroundColor: '#fff', margin: 20, padding: 30, borderRadius: 24, elevation: 4 },
  avatarContainer: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#2952a3', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: 'bold' },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  userEmail: { fontSize: 14, color: '#888', marginTop: 5 },
  shareBadge: { backgroundColor: '#eef2ff', padding: 15, borderRadius: 16, marginTop: 20, width: '100%', alignItems: 'center' },
  shareBadgeTitle: { color: '#2952a3', fontWeight: 'bold', fontSize: 14, marginBottom: 5 },
  shareAmount: { fontSize: 20, fontWeight: 'bold', color: '#2ecc71' },
  shareDate: { fontSize: 10, color: '#888', marginTop: 5 },
  whatsappButton: { backgroundColor: '#25D366', flexDirection: 'row', marginHorizontal: 20, padding: 15, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 2, marginBottom: 10 },
  whatsappButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  menuSection: { backgroundColor: '#fff', margin: 20, borderRadius: 16, padding: 10, elevation: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  menuText: { flex: 1, marginLeft: 15, fontSize: 16, color: '#333' }
});

export default ProfileScreen;