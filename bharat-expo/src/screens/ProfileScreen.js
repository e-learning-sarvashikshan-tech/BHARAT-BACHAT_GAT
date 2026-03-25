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
  Modal,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import { useFocusEffect } from '@react-navigation/native';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import * as Print from 'expo-print';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import api from '../services/api';
import { COLORS } from '../constants/theme';

const ProfileScreen = ({ navigation }) => {
  const { t, i18n } = useTranslation();
  const [userData, setUserData] = useState(null);
  const [totalSavings, setTotalSavings] = useState(0);
  const [activeLoans, setActiveLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const [fullScreenImage, setFullScreenImage] = useState(false);

  const [langModalVisible, setLangModalVisible] = useState(false);
  const profileCardRef = useRef();

  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [startDate, setStartDate] = useState(new Date(new Date().setMonth(new Date().getMonth() - 1)));
  const [endDate, setEndDate] = useState(new Date());
  const [datePickerTarget, setDatePickerTarget] = useState(null);

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [expandedFaq, setExpandedFaq] = useState(null);

  const fetchUserProfile = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await api.get('/user/dashboard', { headers: { Authorization: `Bearer ${token}` } });
      setUserData(response.data.user);
      setTotalSavings(response.data.total_savings || 0);
      setActiveLoans(response.data.personal_loans || []);
    } catch (error) {
      console.error("Failed to fetch profile data:", error);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { fetchUserProfile(); }, []));

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert(t('common.error', 'Permission Required'), 'You need to allow camera roll access to upload a photo.');
      return;
    }
    let pickerResult = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.5 });
    if (!pickerResult.canceled) uploadProfileImage(pickerResult.assets[0].uri);
  };

  const uploadProfileImage = async (imageUri) => {
    setIsUploadingImage(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;

      let formData = new FormData();
      formData.append('profile_photo', { uri: imageUri, name: filename, type: type });

      const response = await api.post('/user/profile/photo', formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data', 'Accept': 'application/json' }
      });

      if (response.data.status === 'success') {
        setUserData({ ...userData, profile_photo_url: response.data.photo_url });
        Alert.alert(t('common.success', 'Success'), 'Profile photo updated!');
      }
    } catch (error) {
      Alert.alert('Upload Failed', error.response?.data?.message || 'Check your terminal console for the exact error.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const openEditModal = () => {
    setEditName(userData?.name || '');
    setEditPhone(userData?.phone || '');
    setEditModalVisible(true);
  };

  const handleUpdateProfile = async () => {
    if (!editName.trim() || !editPhone.trim()) return Alert.alert(t('common.error', 'Error'), "Name and Phone number cannot be empty.");
    setIsUpdatingProfile(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await api.put('/user/profile/update', { name: editName, phone: editPhone }, { headers: { Authorization: `Bearer ${token}` } });
      if (response.data.status === 'success') {
        setUserData(response.data.user);
        setEditModalVisible(false);
        Alert.alert(t('common.success', 'Success'), t('profile.updateSuccess', 'Your profile has been updated successfully!'));
      }
    } catch (error) {
      Alert.alert(t('common.error', 'Error'), "Failed to update profile. Please try again.");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const handleShareProfile = async () => {
    try {
      setIsSharing(true);
      const localUri = await captureRef(profileCardRef, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(localUri, { dialogTitle: 'Share my Bharat Bachat Profile' });
      else Alert.alert(t('common.error', "Error"), "Sharing is not available on this device.");
    } catch (error) {
      Alert.alert(t('common.error', "Error"), "Failed to generate profile image.");
    } finally {
      setIsSharing(false);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    if (Platform.OS === 'android') setDatePickerTarget(null);
    if (selectedDate) {
      if (datePickerTarget === 'start') setStartDate(selectedDate);
      if (datePickerTarget === 'end') setEndDate(selectedDate);
    }
  };

  const generateFilteredStatementPDF = async () => {
    if (startDate > endDate) return Alert.alert(t('common.error', "Error"), "Start date cannot be after the end date.");
    setIsGenerating(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      const response = await api.post(`/user/ledger/export`, {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      }, { headers: { Authorization: `Bearer ${token}` } });

      const filteredTransactions = response.data.transactions;

      if (filteredTransactions.length === 0) {
        Alert.alert(t('common.warning', "No Data"), t('alerts.noTxWarning', "There are no transactions recorded in this date range."));
        setIsGenerating(false);
        return;
      }

      let tableRows = '';
      let totalDeposited = 0;
      let totalWithdrawn = 0;

      filteredTransactions.forEach((tx) => {
        const date = new Date(tx.transaction_date).toLocaleDateString();
        const typeColor = tx.type === 'deposit' ? COLORS.success : COLORS.danger;
        const sign = tx.type === 'deposit' ? '+' : '-';
        if (tx.type === 'deposit' && tx.category !== 'voided') totalDeposited += parseFloat(tx.amount);
        if (tx.type === 'withdrawal' && tx.category !== 'voided') totalWithdrawn += parseFloat(tx.amount);

        tableRows += `
            <tr>
              <td>${date}</td>
              <td>${tx.group?.name || 'Manual'}</td>
              <td>${tx.method || 'Transfer'}</td>
              <td style="color: ${typeColor}; font-weight: bold; text-align: right;">${sign}₹${tx.amount}</td>
            </tr>
          `;
      });

      // --- UPGRADED: PREMIUM PDF HTML TEMPLATE ---
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Courier New', Courier, monospace; padding: 40px; color: #333; background-color: #fdfbf7; }
              .header { text-align: center; border-bottom: 2px solid #d1c7a3; padding-bottom: 20px; margin-bottom: 30px; }
              .logo { font-size: 32px; font-weight: 900; color: ${COLORS.primaryBlue}; margin: 0; text-transform: uppercase; }
              .sub-logo { font-size: 14px; font-weight: bold; color: #5c5442; margin-top: 5px; letter-spacing: 2px; }
              .user-details { text-align: center; font-size: 18px; font-weight: bold; color: #333; margin-top: 10px; }
              .summary-box { background-color: #efeadd; padding: 20px; border-radius: 8px; margin-bottom: 30px; display: flex; justify-content: space-between; border: 1px solid #d1c7a3; }
              .summary-item { text-align: center; }
              .summary-title { font-size: 12px; color: #5c5442; text-transform: uppercase; font-weight: bold; margin: 0; }
              .summary-amount { font-size: 22px; margin: 5px 0 0 0; font-weight: bold; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; border: 1px solid #d1c7a3; }
              th { background-color: #efeadd; color: #5c5442; font-weight: bold; text-align: left; padding: 12px 10px; border-bottom: 2px solid #d1c7a3; text-transform: uppercase; font-size: 12px; }
              td { padding: 12px 10px; border-bottom: 1px solid #e8e4d3; font-size: 13px; }
              .stamp-container { text-align: right; margin-top: 40px; padding-right: 20px; }
              .stamp { display: inline-block; border: 3px solid #16a34a; color: #16a34a; font-weight: 900; padding: 15px; border-radius: 50%; transform: rotate(-15deg); text-align: center; letter-spacing: 1px; }
            </style>
          </head>
          <body>
            <div class="header">
              <p class="logo">Bharat Bachat</p>
              <p class="sub-logo">PERSONAL CONSOLIDATED STATEMENT</p>
              <p class="user-details">${userData?.name || 'Member'} (${userData?.phone || ''})</p>
              <p style="font-size: 14px; color: #5c5442; margin-top: 10px;">Period: ${startDate.toDateString()} to ${endDate.toDateString()}</p>
            </div>
            
            <div class="summary-box">
              <div class="summary-item"><p class="summary-title">Total Added (+)</p><p class="summary-amount" style="color: #16a34a;">₹${totalDeposited.toLocaleString()}</p></div>
              <div class="summary-item"><p class="summary-title">Total Withdrawn (-)</p><p class="summary-amount" style="color: #dc2626;">₹${totalWithdrawn.toLocaleString()}</p></div>
              <div class="summary-item"><p class="summary-title">Net Flow</p><p class="summary-amount" style="color: ${COLORS.primaryBlue};">₹${(totalDeposited - totalWithdrawn).toLocaleString()}</p></div>
            </div>

            <table>
              <thead><tr><th>Date</th><th>Bachat Gat Name</th><th>Particulars</th><th style="text-align: right;">Amount</th></tr></thead>
              <tbody>${tableRows}</tbody>
            </table>
            
            <div class="stamp-container">
               <div class="stamp">DIGITALLY<br/>VERIFIED</div>
            </div>

            <p style="text-align: center; color: #999; font-size: 11px; margin-top: 30px;">
              Generated securely by the Bharat Bachat App.
            </p>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      if (Platform.OS === 'android') {
        try {
          const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
          if (permissions.granted) {
            const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
            const savedUri = await FileSystem.StorageAccessFramework.createFileAsync(permissions.directoryUri, `My_Statement_${startDate.toISOString().split('T')[0]}.pdf`, 'application/pdf');
            await FileSystem.writeAsStringAsync(savedUri, base64, { encoding: FileSystem.EncodingType.Base64 });
            Alert.alert(t('common.success', "Success"), "Statement downloaded successfully to your device!");
            setExportModalVisible(false);
          } else {
            await Sharing.shareAsync(uri);
            setExportModalVisible(false);
          }
        } catch (e) {
          await Sharing.shareAsync(uri);
          setExportModalVisible(false);
        }
      } else {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        setExportModalVisible(false);
      }
    } catch (error) {
      console.error("PDF Gen Error:", error);
      Alert.alert(t('common.error', "Error"), "Could not generate PDF statement.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(t('profile.logout', "Log Out"), "Are you sure you want to log out of Bharat Bachat?", [
      { text: t('common.cancel', "Cancel"), style: "cancel" },
      {
        text: t('profile.logout', "Logout"), style: "destructive", onPress: async () => {
          await SecureStore.deleteItemAsync('userToken');
          navigation.replace('Login');
        }
      }
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('profile.deleteAccountTitle', "Delete Account"),
      t('profile.deleteAccountDesc', "Are you absolutely sure? This will permanently delete your profile. You cannot do this if you have active loans."),
      [
        { text: t('common.cancel', "Cancel"), style: "cancel" },
        {
          text: t('common.delete', "Delete"),
          style: "destructive",
          onPress: async () => {
            setIsDeletingAccount(true);
            try {
              const token = await SecureStore.getItemAsync('userToken');
              await api.delete('/user/profile/delete', { headers: { Authorization: `Bearer ${token}` } });
              await SecureStore.deleteItemAsync('userToken');
              Alert.alert(t('common.success', "Success"), t('profile.accountDeletedDesc', "Your account has been successfully removed."));
              navigation.replace('Login');
            } catch (error) {
              Alert.alert(t('common.error', "Error"), error.response?.data?.message || t('profile.deleteErrorFallback', "Please clear all active loans or group admin duties before deleting."));
            } finally {
              setIsDeletingAccount(false);
            }
          }
        }
      ]
    );
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

  const toggleFaq = (id) => { setExpandedFaq(expandedFaq === id ? null : id); };

  const renderFaqItem = (id, qKey, aKey) => {
    const isExpanded = expandedFaq === id;
    return (
      <TouchableOpacity style={[styles.faqBox, isExpanded && styles.faqBoxActive]} onPress={() => toggleFaq(id)} activeOpacity={0.7}>
        <View style={styles.faqQRow}>
          <Text style={[styles.faqQ, isExpanded && { color: COLORS.primaryBlue }]}>{t(qKey)}</Text>
          <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={isExpanded ? COLORS.primaryBlue : COLORS.textMuted} />
        </View>
        {isExpanded && <View style={styles.faqAContainer}><Text style={styles.faqA}>{t(aKey)}</Text></View>}
      </TouchableOpacity>
    );
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color={COLORS.primaryBlue} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('profile.title', 'My Profile')}</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>

        <View collapsable={false} ref={profileCardRef} style={styles.profileHeaderCard}>
          <View style={styles.avatarCircle}>
            {isUploadingImage ? (
              <ActivityIndicator size="small" color={COLORS.primaryBlue} />
            ) : userData?.profile_photo_url ? (
              <TouchableOpacity onPress={() => setFullScreenImage(true)} style={{ width: '100%', height: '100%', borderRadius: 45, overflow: 'hidden' }}>
                <Image source={{ uri: userData.profile_photo_url + '?t=' + new Date().getTime() }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
              </TouchableOpacity>
            ) : (
              <Text style={styles.avatarText}>{userData?.name ? userData.name.charAt(0).toUpperCase() : 'U'}</Text>
            )}
            <TouchableOpacity style={styles.editAvatarBtn} onPress={handlePickImage}><Ionicons name="camera" size={14} color={COLORS.bgWhite} /></TouchableOpacity>
          </View>

          <Text style={styles.userName}>{userData?.name || 'Member Name'}</Text>
          <Text style={styles.userPhone}>{userData?.phone || userData?.email}</Text>

          <View style={styles.joinedBadge}>
            <Ionicons name="shield-checkmark" size={14} color={COLORS.success} />
            <Text style={styles.joinedText}>{t('profile.verified', 'Verified Member')}</Text>
          </View>

          <View style={{ marginTop: 20, width: '100%', paddingHorizontal: 30 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
              <Text style={{ fontSize: 13, fontWeight: 'bold', color: COLORS.textGray }}>{t('profile.trustScore', 'Bachat Trust Score')}</Text>
              <Text style={{ fontSize: 18, fontWeight: '900', color: (650 + (totalSavings * 0.01)) > 750 ? COLORS.success : COLORS.warning }}>
                {Math.min(Math.floor(650 + (totalSavings * 0.01)), 850)}
              </Text>
            </View>
            <View style={{ height: 8, backgroundColor: COLORS.borderLight, borderRadius: 4, overflow: 'hidden' }}>
              <View style={{ height: '100%', backgroundColor: (650 + (totalSavings * 0.01)) > 750 ? COLORS.success : COLORS.warning, width: `${Math.min(((650 + (totalSavings * 0.01)) / 850) * 100, 100)}%` }} />
            </View>
            <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 5, textAlign: 'right' }}>
              {(650 + (totalSavings * 0.01)) > 750 ? t('profile.excellent', 'Excellent Standing') : t('profile.good', 'Good Standing')}
            </Text>
          </View>
        </View>

        <View style={styles.shareContainer}>
          <TouchableOpacity style={[styles.shareButton, isSharing && { opacity: 0.7 }]} onPress={handleShareProfile} disabled={isSharing}>
            {isSharing ? <ActivityIndicator color={COLORS.bgWhite} /> : (
              <><Ionicons name="share-social-outline" size={20} color={COLORS.bgWhite} style={{ marginRight: 8 }} /><Text style={styles.shareText}>{t('profile.shareMilestone', 'Share My Progress')}</Text></>
            )}
          </TouchableOpacity>
        </View>

        {activeLoans.length > 0 && (
          <View style={{ padding: 20, backgroundColor: COLORS.bgWhite, marginTop: 15, elevation: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 15 }}>{t('loanHub.title', 'My Active Loans')}</Text>
            {activeLoans.map(loan => {
              const principal = parseFloat(loan.principal_amount);
              const rate = parseFloat(loan.interest_rate);
              const totalDue = principal + (principal * (rate / 100) * loan.duration_months);

              return (
                <View key={loan.id} style={{ backgroundColor: '#fdf7f2', padding: 15, borderRadius: 12, marginBottom: 10, borderWidth: 1, borderColor: '#fae3ce' }}>
                  <Text style={{ fontSize: 14, color: COLORS.warning, fontWeight: 'bold', marginBottom: 5 }}>{loan.group?.name}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ color: COLORS.textGray, fontSize: 13 }}>{t('loanHub.principal', 'Principal')}: <Text style={{ fontWeight: 'bold', color: COLORS.textDark }}>₹{principal}</Text></Text>
                    <Text style={{ color: COLORS.textGray, fontSize: 13 }}>{t('loanHub.totalDue', 'Pending')}: <Text style={{ fontWeight: 'bold', color: COLORS.danger }}>₹{Math.ceil(totalDue - parseFloat(loan.amount_paid || 0))}</Text></Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={styles.menuContainer}>
          <Text style={styles.menuHeader}>{t('profile.accountSettings', 'Account Settings')}</Text>

          <TouchableOpacity style={styles.menuItem} onPress={openEditModal}>
            <View style={styles.menuIconBox}><Ionicons name="person-outline" size={20} color={COLORS.primaryBlue} /></View>
            <Text style={styles.menuText}>{t('profile.editProfile', 'Edit Personal Details')}</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => setLangModalVisible(true)}>
            <View style={styles.menuIconBox}><Ionicons name="language-outline" size={20} color={COLORS.primaryBlue} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.menuText}>{t('profile.changeLanguage', 'App Language')}</Text>
              <Text style={{ fontSize: 12, color: COLORS.textMuted, marginTop: 2 }}>{getCurrentLanguageName()}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => setExportModalVisible(true)}>
            <View style={[styles.menuIconBox, { backgroundColor: '#e6f4ea' }]}><Ionicons name="download-outline" size={20} color={COLORS.success} /></View>
            <Text style={styles.menuText}>{t('profile.downloadStatement', 'Download Complete Statement')}</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          <Text style={styles.menuHeader}>{t('profile.support', 'Support & About')}</Text>

          <TouchableOpacity style={styles.menuItem} onPress={() => setHelpModalVisible(true)}>
            <View style={[styles.menuIconBox, { backgroundColor: '#dcfce7' }]}><Ionicons name="help-buoy" size={20} color="#16a34a" /></View>
            <Text style={styles.menuText}>{t('profile.helpSupport', 'Help & Support / FAQ')}</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('TermsScreen')}>
            <View style={[styles.menuIconBox, { backgroundColor: '#f3e8ff' }]}><Ionicons name="shield" size={20} color="#9333ea" /></View>
            <Text style={styles.menuText}>{t('profile.terms', 'Terms & Privacy Policy')}</Text>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={handleDeleteAccount} disabled={isDeletingAccount}>
            <View style={[styles.menuIconBox, { backgroundColor: '#ffebee' }]}><Ionicons name="trash" size={20} color={COLORS.danger} /></View>
            {isDeletingAccount ? (
              <ActivityIndicator size="small" color={COLORS.danger} style={{ flex: 1, alignItems: 'flex-start' }} />
            ) : (
              <Text style={[styles.menuText, { color: COLORS.danger }]}>{t('profile.deleteAccountBtn', 'Delete Account')}</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSection}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={20} color={COLORS.danger} style={{ marginRight: 8 }} />
            <Text style={styles.logoutText}>{t('profile.logout', 'Log Out')}</Text>
          </TouchableOpacity>
          <Text style={styles.versionText}>{t('profile.version', 'Bharat Bachat App v1.0.0')}</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={editModalVisible} transparent={true} animationType="slide">
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('profile.editProfile', 'Edit Personal Details')}</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}><Ionicons name="close" size={24} color={COLORS.textDark} /></TouchableOpacity>
            </View>
            <Text style={styles.dateLabel}>{t('login.fullName', 'Full Name')}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="person-outline" size={20} color={COLORS.textMuted} style={{ marginRight: 10 }} />
              <TextInput style={styles.textInput} value={editName} onChangeText={setEditName} placeholder="Enter Full Name" />
            </View>
            <Text style={styles.dateLabel}>{t('login.mobileNumber', 'Mobile Number')}</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="call-outline" size={20} color={COLORS.textMuted} style={{ marginRight: 10 }} />
              <TextInput style={styles.textInput} value={editPhone} onChangeText={setEditPhone} keyboardType="numeric" maxLength={10} placeholder="10 Digits" />
            </View>
            <TouchableOpacity style={[styles.generateBtn, isUpdatingProfile && { opacity: 0.7 }]} onPress={handleUpdateProfile} disabled={isUpdatingProfile}>
              {isUpdatingProfile ? <ActivityIndicator color={COLORS.bgWhite} /> : <Text style={styles.generateBtnText}>{t('profile.saveChanges', 'Save Changes')}</Text>}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={exportModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('exportLedger.modalTitle', 'Download Statement')}</Text>
              <TouchableOpacity onPress={() => setExportModalVisible(false)}><Ionicons name="close" size={24} color={COLORS.textDark} /></TouchableOpacity>
            </View>
            <Text style={{ color: COLORS.textGray, marginBottom: 20 }}>{t('exportLedger.modalDesc', "Select a date range to filter and download your financial records.")}</Text>
            <Text style={styles.dateLabel}>{t('exportLedger.startDate', 'Start Date')}</Text>
            <TouchableOpacity style={styles.dateInput} onPress={() => setDatePickerTarget('start')}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.primaryBlue} style={{ marginRight: 10 }} />
              <Text style={styles.dateText}>{startDate.toDateString()}</Text>
            </TouchableOpacity>
            <Text style={styles.dateLabel}>{t('exportLedger.endDate', 'End Date')}</Text>
            <TouchableOpacity style={styles.dateInput} onPress={() => setDatePickerTarget('end')}>
              <Ionicons name="calendar-outline" size={20} color={COLORS.primaryBlue} style={{ marginRight: 10 }} />
              <Text style={styles.dateText}>{endDate.toDateString()}</Text>
            </TouchableOpacity>
            {datePickerTarget && (
              <DateTimePicker value={datePickerTarget === 'start' ? startDate : endDate} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={handleDateChange} maximumDate={new Date()} />
            )}
            {Platform.OS === 'ios' && datePickerTarget && (
              <TouchableOpacity style={styles.doneBtn} onPress={() => setDatePickerTarget(null)}><Text style={{ color: COLORS.primaryBlue, fontWeight: 'bold' }}>{t('exportLedger.done', 'Done')}</Text></TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.generateBtn, isGenerating && { opacity: 0.7 }]} onPress={generateFilteredStatementPDF} disabled={isGenerating}>
              {isGenerating ? <ActivityIndicator color={COLORS.bgWhite} /> : (
                <><Ionicons name="download" size={20} color={COLORS.bgWhite} style={{ marginRight: 8 }} /><Text style={styles.generateBtnText}>{t('exportLedger.generateBtn', 'Generate PDF')}</Text></>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={langModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('profile.changeLanguage', 'Select Language')}</Text>
              <TouchableOpacity onPress={() => setLangModalVisible(false)}><Ionicons name="close" size={24} color={COLORS.textDark} /></TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.langOption} onPress={() => changeLanguage('en')}>
              <Text style={[styles.langText, i18n.language === 'en' && styles.langTextActive]}>English</Text>
              {i18n.language === 'en' && <Ionicons name="checkmark-circle" size={24} color={COLORS.primaryBlue} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.langOption} onPress={() => changeLanguage('mr')}>
              <Text style={[styles.langText, i18n.language === 'mr' && styles.langTextActive]}>Marathi (मराठी)</Text>
              {i18n.language === 'mr' && <Ionicons name="checkmark-circle" size={24} color={COLORS.primaryBlue} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.langOption} onPress={() => changeLanguage('hi')}>
              <Text style={[styles.langText, i18n.language === 'hi' && styles.langTextActive]}>Hindi (हिंदी)</Text>
              {i18n.language === 'hi' && <Ionicons name="checkmark-circle" size={24} color={COLORS.primaryBlue} />}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={helpModalVisible} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { height: '90%', paddingBottom: 0 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('dashboard.faqHelp', 'Help & Support')}</Text>
              <TouchableOpacity onPress={() => setHelpModalVisible(false)}><Ionicons name="close" size={24} color={COLORS.textDark} /></TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              <View style={styles.aboutCard}>
                <Ionicons name="information-circle" size={24} color="#0284c7" style={{ marginBottom: 10 }} />
                <Text style={styles.helpText}>{t('about.p1', 'Bharat Bachat is a secure digital ledger designed specifically for Self-Help Groups (Bachat Gats).')}</Text>
                <Text style={styles.helpText}>{t('about.p2', 'Our mission is to replace easily-lost paper passbooks with a fully transparent, offline-capable mobile application.')}</Text>
              </View>
              <Text style={styles.faqCategoryTitle}>{t('faq.catGroups', '🏢 Group Management')}</Text>
              {renderFaqItem('q1', 'faq.q1', 'faq.a1')}
              {renderFaqItem('q2', 'faq.q2', 'faq.a2')}
              <Text style={styles.faqCategoryTitle}>{t('faq.catTx', '💰 Transactions & Savings')}</Text>
              {renderFaqItem('q3', 'faq.q3', 'faq.a3')}
              {renderFaqItem('q4', 'faq.q4', 'faq.a4')}
              <Text style={styles.faqCategoryTitle}>{t('faq.catReports', '📄 Receipts & Reports')}</Text>
              {renderFaqItem('q5', 'faq.q5', 'faq.a5')}
              {renderFaqItem('q6', 'faq.q6', 'faq.a6')}
              <Text style={styles.faqCategoryTitle}>{t('faq.catSecurity', '🔒 Security & Loans')}</Text>
              {renderFaqItem('q7', 'faq.q7', 'faq.a7')}
              {renderFaqItem('q8', 'faq.q8', 'faq.a8')}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* NEW: FULL SCREEN IMAGE MODAL */}
      <Modal visible={fullScreenImage} transparent={true} animationType="fade" onRequestClose={() => setFullScreenImage(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' }}>
          <TouchableOpacity
            style={{ position: 'absolute', top: 50, right: 20, zIndex: 10, padding: 15 }}
            onPress={() => setFullScreenImage(false)}
          >
            <Ionicons name="close" size={36} color={COLORS.bgWhite} />
          </TouchableOpacity>

          {userData?.profile_photo_url && (
            <Image
              source={{ uri: userData.profile_photo_url + '?t=' + new Date().getTime() }}
              style={{ width: '100%', height: '80%', resizeMode: 'contain' }}
            />
          )}
        </View>
      </Modal>

    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgLight },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 10, backgroundColor: COLORS.bgWhite, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textDark, textAlign: 'center', width: '100%' },
  profileHeaderCard: { alignItems: 'center', backgroundColor: COLORS.bgWhite, paddingVertical: 30, paddingHorizontal: 20, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, marginBottom: 20 },
  avatarCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: COLORS.primaryBlueLight, justifyContent: 'center', alignItems: 'center', marginBottom: 15, position: 'relative', overflow: 'visible' },
  avatarImage: { width: 90, height: 90, borderRadius: 45 },
  avatarText: { fontSize: 36, fontWeight: 'bold', color: COLORS.primaryBlue },
  editAvatarBtn: { position: 'absolute', bottom: -2, right: -2, backgroundColor: COLORS.primaryBlue, width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: COLORS.bgWhite, zIndex: 10 },
  userName: { fontSize: 24, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 5 },
  userPhone: { fontSize: 16, color: COLORS.textMuted, marginBottom: 15, letterSpacing: 1 },
  joinedBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#e6f4ea', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  joinedText: { marginLeft: 5, fontSize: 12, fontWeight: 'bold', color: COLORS.success },
  shareContainer: { paddingHorizontal: 20, marginBottom: 15 },
  shareButton: { flexDirection: 'row', backgroundColor: COLORS.warning, paddingVertical: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  shareText: { color: COLORS.bgWhite, fontSize: 15, fontWeight: 'bold' },
  menuContainer: { backgroundColor: COLORS.bgWhite, marginHorizontal: 20, borderRadius: 16, padding: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  menuHeader: { fontSize: 13, fontWeight: 'bold', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginTop: 10, marginBottom: 10, marginLeft: 5 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  menuIconBox: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.bgLight, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  menuText: { flex: 1, fontSize: 16, color: COLORS.textDark, fontWeight: '500' },
  bottomSection: { marginTop: 30, paddingHorizontal: 20, alignItems: 'center' },
  logoutButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffe6e6', width: '100%', paddingVertical: 15, borderRadius: 12, justifyContent: 'center', borderWidth: 1, borderColor: '#fad2cf' },
  logoutText: { color: COLORS.danger, fontSize: 16, fontWeight: 'bold' },
  versionText: { color: COLORS.textMuted, fontSize: 12, marginTop: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.bgWhite, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textDark },
  dateLabel: { fontSize: 14, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 8 },
  dateInput: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgLight, borderWidth: 1, borderColor: COLORS.borderLight, padding: 15, borderRadius: 12, marginBottom: 20 },
  dateText: { fontSize: 16, color: COLORS.textDark },
  doneBtn: { alignSelf: 'flex-end', marginBottom: 20 },
  generateBtn: { flexDirection: 'row', backgroundColor: COLORS.primaryBlue, padding: 16, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  generateBtnText: { color: COLORS.bgWhite, fontSize: 16, fontWeight: 'bold' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgLight, borderWidth: 1, borderColor: COLORS.borderLight, paddingHorizontal: 15, borderRadius: 12, marginBottom: 20, height: 55 },
  textInput: { flex: 1, fontSize: 16, color: COLORS.textDark },
  langOption: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  langText: { fontSize: 18, color: COLORS.textDark },
  langTextActive: { fontWeight: 'bold', color: COLORS.primaryBlue },
  aboutCard: { backgroundColor: '#f0f9ff', padding: 20, borderRadius: 16, borderWidth: 1, borderColor: '#bae6fd', marginBottom: 20 },
  helpText: { fontSize: 14, color: '#0369a1', lineHeight: 22, marginBottom: 10, fontWeight: '500' },
  faqCategoryTitle: { fontSize: 13, fontWeight: 'bold', color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1.2, marginTop: 10, marginBottom: 10 },
  faqBox: { backgroundColor: COLORS.bgLight, borderRadius: 12, marginBottom: 12, borderWidth: 1, borderColor: COLORS.borderLight, overflow: 'hidden' },
  faqBoxActive: { borderColor: COLORS.primaryBlueLight, backgroundColor: '#f0f7ff' },
  faqQRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  faqQ: { fontSize: 15, fontWeight: '600', color: COLORS.textDark, flex: 1, paddingRight: 10, lineHeight: 22 },
  faqAContainer: { padding: 16, paddingTop: 0, borderTopWidth: 1, borderTopColor: 'rgba(0,0,0,0.05)' },
  faqA: { fontSize: 14, color: COLORS.textGray, lineHeight: 24, marginTop: 12 }
});

export default ProfileScreen;