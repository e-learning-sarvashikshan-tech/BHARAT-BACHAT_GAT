import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next'; 
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Alert, Share, Modal, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { COLORS } from '../constants/theme'; 

// --- NEW: BULLETPROOF AVATAR COMPONENT ---
// This handles missing URLs, broken links, and React Native silent failures
const MemberAvatar = ({ user, size, fontSize, customStyle }) => {
  const [imgError, setImgError] = useState(false);
  
  // Checking multiple common backend keys just in case the API format changed
  const photoUrl = user?.profile_photo_url || user?.photo || user?.avatar;

  if (photoUrl && !imgError) {
    return (
      <Image 
        source={{ uri: photoUrl }} 
        style={[{ width: size, height: size, borderRadius: size / 2, resizeMode: 'cover' }, customStyle]} 
        onError={() => setImgError(true)} // If URL is broken, fallback to Initials
      />
    );
  }
  
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: COLORS.primaryBlueLight, justifyContent: 'center', alignItems: 'center' }, customStyle]}>
      <Text style={{ fontSize: fontSize, fontWeight: 'bold', color: COLORS.primaryBlue }}>
        {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
      </Text>
    </View>
  );
};

const MembersScreen = ({ route, navigation }) => {
  const { t } = useTranslation(); 
  const { groupId, role, groupDetails } = route.params || {};
  const isAdmin = role === 'admin';

  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedMember, setSelectedMember] = useState(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);

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
      // Log this to your terminal so you can check if profile_photo_url actually exists!
      console.log("Group Members API Response:", response.data.members_status);
      
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

  const openMemberProfile = (member) => {
    setSelectedMember(member);
    setProfileModalVisible(true);
  };

  const renderMember = ({ item }) => {
    const isUserAdmin = item.pivot?.role === 'admin';
    const isCreator = groupDetails?.created_by === item.id;

    return (
      <TouchableOpacity 
        style={styles.memberCard} 
        activeOpacity={0.7} 
        onPress={() => openMemberProfile(item)}
      >
        {/* --- IMPLEMENTED BULLETPROOF AVATAR --- */}
        <MemberAvatar user={item} size={46} fontSize={18} customStyle={{ marginRight: 15 }} />
        
        <View style={styles.memberInfo}>
          <Text style={styles.memberName}>{item.name} {isCreator && '👑'}</Text>
          <Text style={styles.memberContact}>{item.phone || item.email}</Text>
        </View>
        <View style={styles.roleBadge}>
          <Text style={[styles.roleText, isUserAdmin ? styles.textAdmin : styles.textMember]}>
            {isUserAdmin ? t('groupDetails.roleAdmin', 'Admin') : t('groupDetails.roleMember', 'Member')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={COLORS.borderLight} style={{marginLeft: 10}} />
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primaryBlue} /></View>;
  }

  const calculateTrustScore = (member) => {
    if (!member) return 650; 
    const baseScore = 650;
    const isPaid = member.installment_status === 'Paid';
    const totalPaid = parseFloat(member.current_month_paid || 0);
    const bonus = isPaid ? 50 : (totalPaid > 0 ? 20 : 0);
    return Math.min(baseScore + bonus, 850);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('membersList.title', 'Group Directory')}</Text>
        <Text style={styles.memberCount}>{members.length} {t('groupDetails.btnMembers', 'Members')}</Text>
      </View>

      {isAdmin && (
        <View style={styles.adminActionRow}>
          <TouchableOpacity 
            style={[styles.adminBtn, { backgroundColor: COLORS.primaryBlueLight, marginRight: 10 }]} 
            onPress={handleShareInvite}
          >
            <Ionicons name="share-social" size={20} color={COLORS.primaryBlue} />
            <Text style={[styles.adminBtnText, { color: COLORS.primaryBlue }]}>{t('groupDetails.shareBtn', 'Share Invite Code')}</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.adminBtn, { backgroundColor: COLORS.primaryBlue }]} 
            onPress={() => navigation.navigate('AddMember', { groupId: groupId })} 
          >
            <Ionicons name="person-add" size={20} color={COLORS.bgWhite} />
            <Text style={[styles.adminBtnText, { color: COLORS.bgWhite }]}>{t('membersList.addMemberBtn', 'Add Manually')}</Text>
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

      {/* --- ADMIN TRUST VIEW MODAL --- */}
      <Modal visible={profileModalVisible} transparent={true} animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setProfileModalVisible(false)}>
          <View style={styles.modalContent}>
            
            <TouchableOpacity style={styles.closeBtn} onPress={() => setProfileModalVisible(false)}>
              <Ionicons name="close" size={24} color={COLORS.textGray} />
            </TouchableOpacity>

            <View style={styles.modalAvatarContainer}>
              {/* --- IMPLEMENTED BULLETPROOF AVATAR FOR MODAL --- */}
              <MemberAvatar 
                user={selectedMember} 
                size={90} 
                fontSize={36} 
                customStyle={{ borderWidth: 3, borderColor: COLORS.bgWhite, elevation: 2 }} 
              />
              
              {selectedMember?.email_verified_at && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color={COLORS.success} />
                </View>
              )}
            </View>

            <Text style={styles.modalName}>{selectedMember?.name}</Text>
            <Text style={styles.modalRole}>
              {selectedMember?.pivot?.role === 'admin' ? `⭐ ${t('groupDetails.roleAdmin', 'Admin')}` : t('groupDetails.roleMember', 'Member')}
            </Text>

            <View style={styles.contactBox}>
              <View style={styles.contactRow}>
                <Ionicons name="call" size={16} color={COLORS.textMuted} style={{marginRight: 10}} />
                <Text style={styles.contactText}>{selectedMember?.phone || 'No phone provided'}</Text>
              </View>
              <View style={[styles.contactRow, { borderBottomWidth: 0, marginTop: 10 }]}>
                <Ionicons name="mail" size={16} color={COLORS.textMuted} style={{marginRight: 10}} />
                <Text style={styles.contactText}>{selectedMember?.email}</Text>
              </View>
            </View>

            <View style={styles.trustScoreBox}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={styles.trustLabel}>{t('profile.trustScore', 'Bachat Trust Score')}</Text>
                <Text style={[styles.trustValue, { color: calculateTrustScore(selectedMember) > 680 ? COLORS.success : COLORS.warning }]}>
                  {calculateTrustScore(selectedMember)}
                </Text>
              </View>
              <View style={{ height: 6, backgroundColor: COLORS.borderLight, borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ 
                  height: '100%', 
                  backgroundColor: calculateTrustScore(selectedMember) > 680 ? COLORS.success : COLORS.warning, 
                  width: `${(calculateTrustScore(selectedMember) / 850) * 100}%` 
                }} />
              </View>
              <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 8, textAlign: 'center' }}>
                Score based on consistent monthly contributions.
              </Text>
            </View>

            <View style={styles.statusBox}>
              <Text style={styles.statusLabel}>Current Month Status:</Text>
              <View style={[styles.statusPill, selectedMember?.installment_status === 'Paid' ? styles.pillPaid : styles.pillPending]}>
                <Text style={[styles.statusPillText, selectedMember?.installment_status === 'Paid' ? styles.textPaid : styles.textPending]}>
                  {selectedMember?.installment_status === 'Paid' ? t('groupDetails.statusPaid', 'PAID') : t('groupDetails.statusPending', 'PENDING')}
                </Text>
              </View>
            </View>

          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgLight },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: COLORS.bgWhite, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textDark, flex: 1 },
  memberCount: { fontSize: 14, color: COLORS.primaryBlue, fontWeight: 'bold', backgroundColor: COLORS.primaryBlueLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  adminActionRow: { flexDirection: 'row', padding: 20, backgroundColor: COLORS.bgWhite, elevation: 1, marginBottom: 10 },
  adminBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10 },
  adminBtnText: { marginLeft: 8, fontWeight: 'bold', fontSize: 14 },
  listContainer: { padding: 20, paddingBottom: 40 },
  
  memberCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgWhite, padding: 15, borderRadius: 12, marginBottom: 12, elevation: 1 },
  memberInfo: { flex: 1 },
  memberName: { fontSize: 16, fontWeight: 'bold', color: COLORS.textDark },
  memberContact: { fontSize: 13, color: COLORS.textMuted, marginTop: 3 },
  roleBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, backgroundColor: COLORS.bgLight },
  roleText: { fontSize: 11, fontWeight: 'bold', textTransform: 'uppercase' },
  textAdmin: { color: COLORS.warning },
  textMember: { color: COLORS.textGray },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.bgWhite, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, alignItems: 'center' },
  closeBtn: { position: 'absolute', top: 20, right: 20, zIndex: 10 },
  
  modalAvatarContainer: { position: 'relative', marginBottom: 15, marginTop: 10 },
  verifiedBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.bgWhite, borderRadius: 10, padding: 2 },
  
  modalName: { fontSize: 22, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 4 },
  modalRole: { fontSize: 14, color: COLORS.primaryBlue, fontWeight: 'bold', marginBottom: 20 },
  
  contactBox: { width: '100%', backgroundColor: COLORS.bgLight, borderRadius: 12, padding: 15, marginBottom: 20, borderWidth: 1, borderColor: COLORS.borderLight },
  contactRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#e0e0e0', paddingBottom: 10 },
  contactText: { fontSize: 15, color: COLORS.textDark, fontWeight: '500' },
  
  trustScoreBox: { width: '100%', padding: 20, backgroundColor: '#fdf7f2', borderRadius: 12, borderWidth: 1, borderColor: '#fae3ce', marginBottom: 20 },
  trustLabel: { fontSize: 14, fontWeight: 'bold', color: COLORS.textDark },
  trustValue: { fontSize: 24, fontWeight: '900' },
  
  statusBox: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 5 },
  statusLabel: { fontSize: 14, color: COLORS.textGray, fontWeight: '600' },
  statusPill: { paddingHorizontal: 15, paddingVertical: 6, borderRadius: 20 },
  pillPaid: { backgroundColor: '#e6f4ea' },
  pillPending: { backgroundColor: '#fce8e6' },
  statusPillText: { fontSize: 12, fontWeight: 'bold', letterSpacing: 1 },
  textPaid: { color: '#137333' },
  textPending: { color: '#c5221f' }
});

export default MembersScreen;