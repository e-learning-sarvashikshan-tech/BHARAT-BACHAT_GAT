import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

const ProfileScreen = ({ navigation }) => {
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const getProfileData = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        const response = await api.get('/user', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setProfile(response.data);
      } catch (error) {
        console.error("Profile Fetch Error:", error);
      }
    };
    getProfileData();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Profile</Text>
          <View style={{ width: 28 }} /> 
        </View>

        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {profile?.name?.charAt(0) || 'U'}
            </Text>
          </View>
          <Text style={styles.userName}>{profile?.name || "Loading..."}</Text>
          <Text style={styles.userEmail}>{profile?.email || "Email not found"}</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Gat Member</Text>
          </View>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Savings</Text>
            <Text style={styles.statValue}>₹5,500</Text> 
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Active Loan</Text>
            <Text style={[styles.statValue, { color: '#e67e22' }]}>₹2,000</Text>
          </View>
        </View>

        <View style={styles.menuSection}>
          <TouchableOpacity style={styles.menuItem}>
            <Ionicons name="settings-outline" size={24} color="#2952a3" />
            <Text style={styles.menuText}>Account Settings</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.menuItem}>
            <MaterialCommunityIcons name="file-document-outline" size={24} color="#2952a3" />
            <Text style={styles.menuText}>Download My Statements</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('Attendance')}>
            <Ionicons name="calendar-outline" size={24} color="#2952a3" />
            <Text style={styles.menuText}>My Attendance History</Text>
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
  badge: { backgroundColor: '#eef2ff', paddingHorizontal: 15, paddingVertical: 5, borderRadius: 12, marginTop: 15 },
  badgeText: { color: '#2952a3', fontWeight: 'bold', fontSize: 12 },
  statsContainer: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20 },
  statBox: { flex: 1, backgroundColor: '#fff', padding: 20, borderRadius: 16, alignItems: 'center', marginHorizontal: 5, elevation: 2 },
  statLabel: { fontSize: 12, color: '#888', marginBottom: 5 },
  statValue: { fontSize: 18, fontWeight: 'bold', color: '#2ecc71' },
  menuSection: { backgroundColor: '#fff', margin: 20, borderRadius: 16, padding: 10, elevation: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 15, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  menuText: { flex: 1, marginLeft: 15, fontSize: 16, color: '#333' }
});

export default ProfileScreen;