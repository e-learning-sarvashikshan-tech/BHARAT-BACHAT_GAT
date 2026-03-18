import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next'; // ADDED
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

const GroupsHubScreen = ({ navigation }) => {
  const { t } = useTranslation(); // ADDED
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchGroups = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await api.get('/user', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroups(response.data.groups || []);
    } catch (error) {
      console.error("Failed to fetch groups for Hub:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchGroups();
    }, [])
  );

  const renderGroup = ({ item }) => {
    // --- SECURITY LOCK: Check if the user is pending ---
    const isPending = item.pivot.status === 'pending';

    return (
      <TouchableOpacity 
        style={[styles.groupCard, isPending && { opacity: 0.7, backgroundColor: '#fafafa' }]}
        // If pending, do nothing. If approved, navigate to details.
        onPress={() => !isPending && navigation.navigate('GroupDetails', { groupId: item.id, role: item.pivot.role })}
        activeOpacity={isPending ? 1 : 0.7}
      >
        <View style={[styles.groupIconContainer, isPending && { backgroundColor: '#f0f0f0' }]}>
          <Ionicons name="people" size={24} color={isPending ? "#aaa" : "#2952a3"} />
        </View>
        <View style={styles.groupInfo}>
          <Text style={[styles.groupName, isPending && { color: '#888' }]}>{item.name}</Text>
          <Text style={styles.groupRole}>
            {item.pivot.role === 'admin' ? `⭐ ${t('groupDetails.roleAdmin', 'Gat Adhyaksha')}` : t('groupDetails.roleMember', 'Member')}
          </Text>
        </View>
        
        {/* Visual Badge for Pending Status */}
        {isPending ? (
          <View style={styles.pendingBadge}>
            <Text style={styles.pendingBadgeText}>{t('groupDetails.statusPending', 'PENDING')}</Text>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('dashboard.myGroups', 'My Bachat Gats')}</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2952a3" />
        </View>
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderGroup}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>{t('groupsHub.noGroups', "You haven't joined any Bachat Gats yet.")}</Text>
            </View>
          }
        />
      )}

      <View style={styles.footer}>
        <TouchableOpacity style={styles.primaryBtn} onPress={() => navigation.navigate('CreateGroup')}>
          <Ionicons name="add-circle-outline" size={20} color="#fff" style={{ marginRight: 8 }}/>
          <Text style={styles.primaryBtnText}>{t('dashboard.createGroupBtn', 'Create New Group')}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.secondaryBtn} onPress={() => navigation.navigate('JoinGroup')}>
          <Ionicons name="key-outline" size={20} color="#2952a3" style={{ marginRight: 8 }}/>
          <Text style={styles.secondaryBtnText}>{t('dashboard.joinGroupBtn', 'Join with Invite Code')}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  listContainer: { padding: 20, paddingBottom: 160 }, 
  groupCard: { backgroundColor: '#fff', padding: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', elevation: 1, marginBottom: 12 },
  groupIconContainer: { backgroundColor: '#eef2f9', padding: 12, borderRadius: 10 },
  groupInfo: { flex: 1, marginLeft: 15 },
  groupName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  groupRole: { fontSize: 13, color: '#e67e22', fontWeight: 'bold', marginTop: 2 },
  pendingBadge: { backgroundColor: '#fff4e5', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, borderWidth: 1, borderColor: '#ffe0b2' },
  pendingBadgeText: { color: '#e67e22', fontSize: 10, fontWeight: 'bold' },
  emptyState: { padding: 40, alignItems: 'center', justifyContent: 'center', marginTop: 50 },
  emptyStateText: { color: '#888', fontSize: 16, textAlign: 'center' },
  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: '#f4f6f8' },
  primaryBtn: { backgroundColor: '#2952a3', flexDirection: 'row', padding: 16, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 2, marginBottom: 10 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  secondaryBtn: { backgroundColor: '#fff', flexDirection: 'row', padding: 16, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#2952a3' },
  secondaryBtnText: { color: '#2952a3', fontSize: 16, fontWeight: 'bold' }
});

export default GroupsHubScreen;