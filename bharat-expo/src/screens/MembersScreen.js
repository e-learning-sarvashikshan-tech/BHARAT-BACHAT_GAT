import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next'; // <-- IMPORTED TRANSLATION
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';

const MembersScreen = ({ route, navigation }) => {
  const { t } = useTranslation(); // <-- INITIALIZED HOOK
  const { groupId, role, groupDetails } = route.params || {};
  const isAdmin = role === 'admin';

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = async () => {
    if (!groupId) {
      Alert.alert(t('common.error', 'Error'), "No Group ID provided.");
      navigation.goBack();
      return;
    }

    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await api.get(`/group/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMembers(response.data.members_status || []);
    } catch (error) {
      console.error("Fetch Members Error:", error);
      Alert.alert(t('common.error', 'Error'), "Could not load group members.");
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchMembers();
    }, [groupId])
  );

  const handleShareInvite = async () => {
    try {
      const shareMessage = `🤝 *Join our Bachat Gat!*\n\n` +
                           `Group Name: *${groupDetails?.name}*\n` +
                           `Monthly Due: ₹${groupDetails?.monthly_contribution}\n\n` +
                           `Download the Bharat Bachat app and use our secure Invite Code: *${groupDetails?.invite_code}*`;

      await Share.share({ message: shareMessage, title: 'Join Bharat Bachat' });
    } catch (error) {
      Alert.alert(t('common.error', 'Error'), "Could not open the share menu.");
    }
  };

  const renderMember = ({ item }) => {
    const isUserAdmin = item.pivot?.role === 'admin';
    const isCreator = groupDetails?.created_by === item.id;

    return (
      <View style={styles.memberCard}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{item.name} {isCreator && '👑'}</Text>
          <Text style={styles.memberContact}>{item.phone || item.email}</Text>
        </View>
        <View style={styles.roleBadge}>
          <Text style={[styles.roleText, isUserAdmin ? styles.textAdmin : styles.textMember]}>
            {isUserAdmin ? t('groupDetails.roleAdmin', 'Admin') : t('groupDetails.roleMember', 'Member')}
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color="#2952a3" /></View>;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('membersList.title', 'Group Directory')}</Text>
        <Text style={styles.memberCount}>{members.length} {t('groupDetails.btnMembers', 'Members')}</Text>
      </View>

      {isAdmin && (
        <View style={styles.adminActionRow}>
          <TouchableOpacity 
            style={[styles.adminBtn, { backgroundColor: '#eef2f9', marginRight: 10 }]} 
            onPress={handleShareInvite}
          >
            <Ionicons name="share-social" size={20} color="#2952a3" />
            <Text style={[styles.adminBtnText, { color: '#2952a3' }]}>{t('groupDetails.shareBtn', 'Share Invite Code')}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.adminBtn, { backgroundColor: '#2952a3' }]} 
            onPress={() => navigation.navigate('AddMember', { groupId: groupId })} 
          >
            <Ionicons name="person-add" size={20} color="#fff" />
            <Text style={[styles.adminBtnText, { color: '#fff' }]}>{t('membersList.addMemberBtn', 'Add Manually')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={members}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMember}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', flex: 1 },
  memberCount: { fontSize: 14, color: '#888', fontWeight: 'bold', backgroundColor: '#eef2f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  adminActionRow: { flexDirection: 'row', padding: 20, backgroundColor: '#fff', elevation: 1, marginBottom: 10 },
  adminBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10 },
  adminBtnText: { marginLeft: 8, fontWeight: 'bold', fontSize: 14 },
  listContainer: { padding: 20, paddingBottom: 40 },
  memberCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 15, borderRadius: 12, marginBottom: 12, elevation: 1 },
  avatarCircle: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#f4f6f8', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { fontSize: 18, fontWeight: 'bold', color: '#2952a3' },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  memberContact: { fontSize: 13, color: '#888', marginTop: 3 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: '#f4f6f8' },
  roleText: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  textAdmin: { color: '#e67e22' },
  textMember: { color: '#888' }
});

export default MembersScreen;