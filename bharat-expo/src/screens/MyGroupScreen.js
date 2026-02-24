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

const MyGroupScreen = ({ navigation }) => {
  const [groupData, setGroupData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useFocusEffect(
    useCallback(() => {
      const fetchGroupDetails = async () => {
        setLoading(true);
        setError('');
        try {
          // Calls Kunal's Laravel API to get the group and its members
          const response = await api.get('/my-group');
          setGroupData(response.data);
        } catch (err) {
          if (err.response && err.response.status === 404) {
            setError("You haven't joined or created a group yet.");
          } else {
            setError("Failed to load group details. Check your connection.");
          }
        } finally {
          setLoading(false);
        }
      };

      fetchGroupDetails();
    }, [])
  );

  // How each individual member looks in the list
  const renderMemberItem = ({ item }) => (
    <View style={styles.memberCard}>
      <View style={styles.avatarCircle}>
        <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.memberInfo}>
        <Text style={styles.memberName}>{item.name}</Text>
        <Text style={styles.memberPhone}>{item.phone}</Text>
      </View>
      {/* Highlight the group creator */}
      {groupData && groupData.created_by === item.id && (
        <View style={styles.leaderBadge}>
          <Text style={styles.leaderText}>Leader</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2952a3" />
        <Text style={styles.loadingText}>Loading your Gat...</Text>
      </View>
    );
  }

  // If the user isn't in a group yet
  if (error || !groupData) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="people-circle-outline" size={80} color="#ccc" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => navigation.navigate('CreateGroup')}
        >
          <Text style={styles.actionButtonText}>Create a Group Now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Group Header */}
      <View style={styles.headerCard}>
        <Text style={styles.appTitle}>Bharat Bachat (Bachat Gat App)</Text>
        <Text style={styles.groupName}>{groupData.name}</Text>
        <View style={styles.memberCountBadge}>
          <Ionicons name="people" size={16} color="#2952a3" />
          <Text style={styles.memberCountText}>
            {groupData.members ? groupData.members.length : 0} Members
          </Text>
        </View>
      </View>

      {/* Members List */}
      <Text style={styles.listTitle}>Group Members</Text>
      <FlatList
        data={groupData.members}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMemberItem}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  centerContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f4f6f8', padding: 20 },
  loadingText: { marginTop: 10, color: '#888', fontSize: 16 },
  errorText: { fontSize: 16, color: '#555', textAlign: 'center', marginVertical: 20 },
  actionButton: { backgroundColor: '#2952a3', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 8 },
  actionButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  
  headerCard: { backgroundColor: '#fff', padding: 24, paddingBottom: 30, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, alignItems: 'center' },
  appTitle: { fontSize: 12, color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 },
  groupName: { fontSize: 28, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 15 },
  memberCountBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eef2ff', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  memberCountText: { color: '#2952a3', fontWeight: 'bold', marginLeft: 6 },
  
  listTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginHorizontal: 20, marginTop: 20, marginBottom: 10 },
  listContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  
  memberCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 10, elevation: 1, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } },
  avatarCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#2952a3', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  memberPhone: { fontSize: 14, color: '#888', marginTop: 2 },
  
  leaderBadge: { backgroundColor: '#ffe6e6', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  leaderText: { color: '#dc3545', fontSize: 12, fontWeight: 'bold' },
});

export default MyGroupScreen;