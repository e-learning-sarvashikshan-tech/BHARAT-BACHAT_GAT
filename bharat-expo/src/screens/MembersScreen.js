import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api'; // Our bridge to Laravel

const MembersScreen = () => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Run this the exact moment the Members screen opens
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        // 1. Grab the secure key
        const token = await SecureStore.getItemAsync('userToken');
        
        // 2. Ask Laravel for the /members list
        const response = await api.get('/members', {
          headers: { Authorization: `Bearer ${token}` }
        });

        // 3. Save the real database users to our state
        setMembers(response.data);
      } catch (error) {
        console.error("Failed to fetch members:", error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  // How to draw a single row in the list
  const renderItem = ({ item }) => (
    <View style={styles.memberCard}>
      <View style={styles.avatar}>
        {/* We grab the first letter of their name for a cool avatar! */}
        <Text style={styles.avatarText}>{item.name ? item.name.charAt(0).toUpperCase() : '?'}</Text>
      </View>
      <View style={styles.info}>
        {/* Real Name and Email from Laravel */}
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.role}>{item.email}</Text> 
      </View>
      <View style={styles.statusBadge}>
        <Text style={styles.statusText}>Active</Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#2952a3" />
        <Text style={{marginTop: 10, color: '#888'}}>Loading members...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={members}
        keyExtractor={item => item.id.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        // If the database is completely empty except for you, this shows up!
        ListEmptyComponent={<Text style={{textAlign: 'center', marginTop: 20}}>No other members found.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  list: { padding: 20 },
  memberCard: { flexDirection: 'row', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 15, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#2952a3', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  role: { fontSize: 14, color: '#666', marginTop: 4 },
  statusBadge: { backgroundColor: '#e6f4ea', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  statusText: { color: '#1e8e3e', fontSize: 12, fontWeight: 'bold' }
});

export default MembersScreen;