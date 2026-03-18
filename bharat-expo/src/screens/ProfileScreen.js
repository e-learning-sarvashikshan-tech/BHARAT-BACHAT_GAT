import React, { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next'; 
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  ActivityIndicator, 
  Alert,
  Modal 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useFocusEffect } from '@react-navigation/native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system'; // <-- ADDED FOR CSV DOWNLOAD
import api from '../services/api';

const ProfileScreen = ({ navigation }) => {
  const { t, i18n } = useTranslation(); 
  const [userData, setUserData] = useState(null);
  const [totalSavings, setTotalSavings] = useState(0);
  const [activeLoans, setActiveLoans] = useState([]); // <-- NEW STATE FOR LOANS
  const [loading, setLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false); // <-- DOWNLOAD STATE
  
  const [langModalVisible, setLangModalVisible] = useState(false);
  const profileCardRef = useRef();

  const fetchUserProfile = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await api.get('/user/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUserData(response.data.user);
      setTotalSavings(response.data.total_savings || 0);
      setActiveLoans(response.data.personal_loans || []); // <-- GET LOANS FROM BACKEND
    } catch (error) {
      console.error("Failed to fetch profile data:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchUserProfile(); }, []));

  const handleShareProfile = async () => {
    try {
      setIsSharing(true);
      const localUri = await captureRef(profileCardRef, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(localUri, { dialogTitle: 'Share my Bharat Bachat Profile' });
      } else {
        Alert.alert(t('common.error', "Error"), "Sharing is not available on this device.");
      }
    } catch (error) {
      Alert.alert(t('common.error', "Error"), "Failed to generate profile image.");
    } finally {
      setIsSharing(false);
    }
  };

  // --- NEW GENERATE & DOWNLOAD CSV STATEMENT FUNCTION ---
  const handleDownloadStatement = async () => {
    try {
      setIsDownloading(true);
      const token = await SecureStore.getItemAsync('userToken');
      
      // Fetch all transactions across all groups for this user
      const response = await api.get('/transactions/user', { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      
      const txs = response.data.transactions || [];
      if (txs.length === 0) {
          Alert.alert(t('common.warning', 'Warning'), "You have no transactions to download.");
          return;
      }

      // Build CSV String
      let csvContent = "Date,Group Name,Type,Amount,Method,Category\n";
      txs.forEach(tx => {
          const date = new Date(tx.transaction_date).toLocaleDateString();
          const groupName = tx.group?.name || 'Manual';
          const type = tx.type === 'deposit' ? 'In (+)' : 'Out (-)';
          csvContent += `"${date}","${groupName}","${type}","${tx.amount}","${tx.method}","${tx.category}"\n`;
      });

      // Save to device
      const fileUri = FileSystem.documentDirectory + "My_Bharat_Bachat_Statement.csv";
      await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });

      // Open Share Menu (WhatsApp, Email, Save to Files, etc.)
      await Sharing.shareAsync(fileUri, { dialogTitle: 'Download My Statement' });

    } catch (error) {
      console.error(error);
      Alert.alert(t('common.error', 'Error'), "Could not download the statement.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(t('profile.logout', "Log Out"), "Are you sure you want to log out of Bharat Bachat?", [
        { text: t('common.cancel', "Cancel"), style: "cancel" },
        { text: t('profile.logout', "Logout"), style: "destructive", onPress: async () => {
            await SecureStore.deleteItemAsync('userToken');
            navigation.replace('Login');
          }
        }
      ]);
  };

  const changeLanguage = (langCode) => {
    i18n.changeLanguage(langCode);
    setLangModalVisible(false);
  };

  const getCurrentLanguageName = () => {
    if (i18n.language === 'mr') return 'Marathi (मराठी)';
    if (i18n.language === 'hi') return 'Hindi (हिंदी)';
    return 'English';
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#2952a3" /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile.title', 'My Profile')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        
        <View collapsable={false} ref={profileCardRef} style={styles.profileCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>{userData?.name ? userData.name.charAt(0).toUpperCase() : 'U'}</Text>
          </View>
          <Text style={styles.userName}>{userData?.name || 'Member Name'}</Text>
          <Text style={styles.userContact}>{userData?.phone || userData?.email}</Text>
          
          <View style={styles.savingsBox}>
            <Text style={styles.savingsLabel}>{t('dashboard.totalSavings', 'Total Personal Savings')}</Text>
            <Text style={styles.savingsAmount}>₹{totalSavings}</Text>
          </View>

          <View style={{ marginTop: 20, width: '100%', paddingHorizontal: 30 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                <Text style={{ fontSize: 13, fontWeight: 'bold', color: '#555' }}>Bachat Trust Score</Text>
                <Text style={{ fontSize: 18, fontWeight: '900', color: (650 + (totalSavings * 0.01)) > 750 ? '#137333' : '#e67e22' }}>
                    {Math.min(Math.floor(650 + (totalSavings * 0.01)), 850)}
                </Text>
            </View>
            <View style={{ height: 8, backgroundColor: '#e9ecef', borderRadius: 4, overflow: 'hidden' }}>
                <View style={{ height: '100%', backgroundColor: (650 + (totalSavings * 0.01)) > 750 ? '#28a745' : '#e67e22', width: `${Math.min(((650 + (totalSavings * 0.01)) / 850) * 100, 100)}%` }} />
            </View>
            <Text style={{ fontSize: 11, color: '#888', marginTop: 5, textAlign: 'right' }}>
                {(650 + (totalSavings * 0.01)) > 750 ? 'Excellent Standing' : 'Good Standing'}
            </Text>
          </View>
        </View>

        <View style={styles.shareContainer}>
          <TouchableOpacity style={[styles.shareButton, isSharing && { opacity: 0.7 }]} onPress={handleShareProfile} disabled={isSharing}>
            {isSharing ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="share-social-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text style={styles.shareText}>{t('profile.shareMilestone', 'Share My Progress')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* --- NEW SECTION: PERSONAL ACTIVE LOANS --- */}
        {activeLoans.length > 0 && (
          <View style={{ padding: 20, backgroundColor: '#fff', marginTop: 15, elevation: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15 }}>{t('loanHub.title', 'My Active Loans')}</Text>
            {activeLoans.map(loan => {
              const principal = parseFloat(loan.principal_amount);
              const rate = parseFloat(loan.interest_rate);
              const totalDue = principal + (principal * (rate / 100) * loan.duration_months);
              
              return (
                <View key={loan.id} style={{ backgroundColor: '#fdf7f2', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#fae3ce' }}>
                  <Text style={{ fontSize: 14, color: '#e67e22', fontWeight: 'bold', marginBottom: 5 }}>{loan.group?.name}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                     <Text style={{ color: '#666', fontSize: 13 }}>Loan Amount: <Text style={{fontWeight: 'bold', color: '#333'}}>₹{principal}</Text></Text>
                     <Text style={{ color: '#666', fontSize: 13 }}>Balance: <Text style={{fontWeight: 'bold', color: '#dc3545'}}>₹{Math.ceil(totalDue - parseFloat(loan.amount_paid || 0))}</Text></Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.menuContainer}>
          <Text style={styles.menuHeader}>Account Settings</Text>

          <TouchableOpacity style={styles.menuItem} onPress={() => {
            const details = `${t('login.fullName', 'Full Name')}: ${userData?.name || '-'}\n${t('login.mobileNumber', 'Mobile Number')}: ${userData?.phone || '-'}\n${t('login.emailLabel', 'Email Address')}: ${userData?.email || '-'}`;
            Alert.alert(t('profile.personalDetails', 'Personal Details'), details);
          }}>
            <View style={styles.menuIconBox}><Ionicons name="person-outline" size={20} color="#2952a3" /></View>
            <Text style={styles.menuText}>{t('profile.personalDetails', 'Personal Details')}</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => setLangModalVisible(true)}>
            <View style={styles.menuIconBox}><Ionicons name="language-outline" size={20} color="#2952a3" /></View>
            <View style={{ flex: 1 }}>
                <Text style={styles.menuText}>{t('profile.changeLanguage', 'App Language')}</Text>
                <Text style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{getCurrentLanguageName()}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => Alert.alert(t('profile.helpSupport', 'Help & Support'), t('alerts.helpMessage', 'Please contact your Gat Pramukh for immediate assistance.'))}>
            <View style={styles.menuIconBox}><Ionicons name="help-circle-outline" size={20} color="#2952a3" /></View>
            <Text style={styles.menuText}>{t('profile.helpSupport', 'Help & Support')}</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          {/* --- NEW SECTION: DOWNLOAD PASSBOOK --- */}
          <TouchableOpacity style={styles.menuItem} onPress={handleDownloadStatement} disabled={isDownloading}>
            <View style={[styles.menuIconBox, { backgroundColor: '#e6f4ea' }]}><Ionicons name="download-outline" size={20} color="#137333" /></View>
            <Text style={styles.menuText}>Download Complete Statement</Text>
            {isDownloading ? <ActivityIndicator size="small" color="#137333" /> : <Ionicons name="chevron-forward" size={20} color="#ccc" />}
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color="#dc3545" style={{ marginRight: 8 }} />
            <Text style={styles.logoutText}>{t('profile.logout', 'Log Out')}</Text>
          </TouchableOpacity>
          <Text style={styles.versionText}>{t('profile.version', 'Bharat Bachat App v1.0.0')}</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={langModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('profile.changeLanguage', 'Select Language')}</Text>
              <TouchableOpacity onPress={() => setLangModalVisible(false)}><Ionicons name="close" size={24} color="#333" /></TouchableOpacity>
            </View>

            <TouchableOpacity style={styles.langOption} onPress={() => changeLanguage('en')}>
              <Text style={[styles.langText, i18n.language === 'en' && styles.langTextActive]}>English</Text>
              {i18n.language === 'en' && <Ionicons name="checkmark-circle" size={24} color="#2952a3" />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.langOption} onPress={() => changeLanguage('mr')}>
              <Text style={[styles.langText, i18n.language === 'mr' && styles.langTextActive]}>Marathi (मराठी)</Text>
              {i18n.language === 'mr' && <Ionicons name="checkmark-circle" size={24} color="#2952a3" />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.langOption} onPress={() => changeLanguage('hi')}>
              <Text style={[styles.langText, i18n.language === 'hi' && styles.langTextActive]}>Hindi (हिंदी)</Text>
              {i18n.language === 'hi' && <Ionicons name="checkmark-circle" size={24} color="#2952a3" />}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  profileCard: { backgroundColor: '#fff', alignItems: 'center', paddingTop: 30, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#eee', elevation: 1 },
  avatarCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#eef2f9', justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 2, borderColor: '#d3e0f5' },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#2952a3' },
  userName: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  userContact: { fontSize: 14, color: '#888', marginTop: 5 },
  savingsBox: { backgroundColor: '#f4f6f8', marginTop: 20, paddingVertical: 15, paddingHorizontal: 40, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#eef2f9' },
  savingsLabel: { color: '#888', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  savingsAmount: { color: '#2952a3', fontSize: 28, fontWeight: 'bold' },
  badgeContainer: { marginTop: 20 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e6f4ea', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  badgeText: { color: '#137333', fontSize: 13, fontWeight: 'bold' },
  shareContainer: { padding: 20, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#eee' },
  shareButton: { flexDirection: 'row', backgroundColor: '#e67e22', paddingVertical: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  shareText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
  menuContainer: { backgroundColor: '#fff', marginTop: 15, paddingVertical: 10, elevation: 1 },
  menuHeader: { fontSize: 14, fontWeight: 'bold', color: '#888', textTransform: 'uppercase', letterSpacing: 1, marginLeft: 20, marginBottom: 10, marginTop: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  menuIconBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eef2f9', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuText: { flex: 1, fontSize: 16, color: '#333', fontWeight: '500' },
  bottomSection: { marginTop: 30, paddingHorizontal: 20, alignItems: 'center' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffe6e6', width: '100%', paddingVertical: 15, borderRadius: 12, justifyContent: 'center', borderWidth: 1, borderColor: '#fad2cf' },
  logoutText: { color: '#dc3545', fontSize: 16, fontWeight: 'bold' },
  versionText: { color: '#aaa', fontSize: 12, marginTop: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  langOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#eee' },
  langText: { fontSize: 18, color: '#333' },
  langTextActive: { fontWeight: 'bold', color: '#2952a3' }
});

export default ProfileScreen;