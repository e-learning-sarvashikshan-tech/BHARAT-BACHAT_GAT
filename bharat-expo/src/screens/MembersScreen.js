import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import * as SecureStore from 'expo-secure-store';

const MembersScreen = ({ navigation }) => {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const token = await SecureStore.getItemAsync('userToken');
        const response = await api.get('/members', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setMembers(response.data);
      } catch (error) {
        console.error("Failed to fetch members:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchMembers();
  }, []);

  // The function to handle the delete action
  const handleDeleteMember = (id, name) => {
    Alert.alert(
      "Remove Member",
      `Are you sure you want to remove ${name}?`,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Remove", 
          style: "destructive",
          onPress: async () => {
            try {
              const token = await SecureStore.getItemAsync('userToken');
              await api.delete(`/members/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
              });
              
              // Immediately remove them from the screen without reloading
              setMembers(prevMembers => prevMembers.filter(member => member.id !== id));
            } catch (error) {
              console.error("Failed to delete member:", error);
              Alert.alert("Error", "Could not remove the member.");
            }
          }
        }
      ]
    );
  };

  const renderMember = ({ item }) => (
    <View style={styles.memberCard}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>
          {item.name ? item.name.charAt(0).toUpperCase() : 'U'}
        </Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.name ? item.name : 'New Member'}</Text>
        <Text style={styles.memberEmail}>{item.email ? item.email : 'No email'}</Text>
      </View>
      
      {/* Delete Button */}
      <TouchableOpacity 
        style={{ padding: 10 }} 
        onPress={() => handleDeleteMember(item.id, item.name)}
      >
        <Ionicons name="trash-outline" size={24} color="#dc3545" />
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2952a3" />
        <Text style={{ marginTop: 10, color: '#888' }}>Loading group members...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Group Members</Text>
        
        {/* The new Add Member Button! */}
        <TouchableOpacity onPress={() => navigation.navigate('AddMember')} style={styles.backButton}>
          <Ionicons name="person-add" size={24} color="#2952a3" />
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={members}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMember}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={<Text style={styles.emptyText}>No members found.</Text>}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: '#fff', elevation: 2 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  backButton: { padding: 5 },
  listContainer: { padding: 20 },
  memberCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 2 },
  avatarCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#2952a3', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  memberEmail: { fontSize: 14, color: '#888', marginTop: 2 },
  emptyText: { textAlign: 'center', color: '#888', marginTop: 50 }
});

export default MembersScreen;