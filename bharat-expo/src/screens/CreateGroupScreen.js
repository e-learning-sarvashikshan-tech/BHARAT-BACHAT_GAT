import React, { useState } from 'react';
import { useTranslation } from 'react-i18next'; 
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { COLORS } from '../constants/theme'; 

const CreateGroupScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [groupName, setGroupName] = useState('');
  const [contribution, setContribution] = useState('500'); 
  const [loading, setLoading] = useState(false);
  const [nameError, setNameError] = useState(false); 

  const handleCreateGroup = async () => {
    setNameError(false); 

    if (!groupName.trim()) {
      Alert.alert(t('common.error', 'Error'), t('createGroup.nameError', "Please enter a Gat name."));
      setNameError(true);
      return;
    }

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      
      const response = await api.post('/group/create', {
        name: groupName,
        monthly_contribution: parseFloat(contribution)
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.data.status === 'success') {
        Alert.alert(
          t('common.success', 'Success!'), 
          `${t('createGroup.successDesc', 'Group created successfully!')}\nInvite Code: ${response.data.group.invite_code}`,
          [{ text: "OK", onPress: () => navigation.navigate('MainTabs') }] // <-- FIXED NAVIGATOR CRASH
        );
      }
    } catch (error) {
      if (error.response?.status === 409) {
        setNameError(true); 
        Alert.alert(
          t('createGroup.nameTakenTitle', "Name Already Taken"), 
          error.response.data.message || t('createGroup.nameTakenDesc', "This group name already exists. Please choose a unique name.")
        );
      } else {
        Alert.alert(t('common.error', 'Error'), error.response?.data?.message || t('errors.serverError', "Failed to create group. Check your connection."));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom', 'left', 'right']}>
      
      {/* --- ADDED A HEADER SO USERS CAN GO BACK IF THEY CHANGE THEIR MIND --- */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('createGroup.title', 'Start a New Bachat Gat')}</Text>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1 }} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formContainer}>
            
            <View style={styles.headerInfo}>
              <Ionicons name="people-circle" size={50} color={COLORS.primaryBlue} />
              <Text style={styles.headerText}>{t('createGroup.title', 'Start a New Bachat Gat')}</Text>
              <Text style={styles.subHeaderText}>{t('createGroup.subtitle', 'You will automatically become the Admin of this new group.')}</Text>
            </View>

            <Text style={styles.label}>{t('createGroup.nameLabel', 'Bachat Gat Name')}</Text>
            <TextInput 
              style={[styles.input, nameError && styles.inputError]} 
              placeholder={t('createGroup.namePlaceholder', 'e.g., Mahila Bachat Gat Aundh')}
              placeholderTextColor={COLORS.textMuted}
              value={groupName}
              onChangeText={(text) => {
                setGroupName(text);
                setNameError(false); 
              }}
            />
            {nameError && <Text style={styles.errorHint}>{t('createGroup.nameTakenHint', 'Please choose a different name.')}</Text>}

            <Text style={styles.label}>{t('createGroup.amountLabel', 'Monthly Saving Amount (₹)')}</Text>
            <TextInput 
              style={styles.input} 
              placeholder="500"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              value={contribution}
              onChangeText={setContribution}
            />

            <TouchableOpacity 
              style={[styles.createButton, loading && styles.disabledButton]} 
              onPress={handleCreateGroup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.bgWhite} />
              ) : (
                <Text style={styles.createButtonText}>{t('createGroup.createBtn', 'Create Group')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgLight },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: Platform.OS === 'android' ? 40 : 20, backgroundColor: COLORS.bgWhite, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textDark },
  formContainer: { padding: 20, marginTop: 10 },
  headerInfo: { alignItems: 'center', marginBottom: 30, backgroundColor: COLORS.bgWhite, padding: 20, borderRadius: 16, elevation: 1 },
  headerText: { fontSize: 20, fontWeight: 'bold', color: COLORS.textDark, marginTop: 10 },
  subHeaderText: { fontSize: 13, color: COLORS.textGray, textAlign: 'center', marginTop: 5, lineHeight: 18 },
  label: { fontSize: 15, fontWeight: 'bold', color: COLORS.textGray, marginBottom: 8, marginTop: 15 },
  input: { backgroundColor: COLORS.bgWhite, padding: 15, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: COLORS.primaryBlueLight, elevation: 1, color: COLORS.textDark },
  inputError: { borderColor: COLORS.danger, backgroundColor: '#fffafa', borderWidth: 1.5 },
  errorHint: { color: COLORS.danger, fontSize: 12, marginTop: 4, marginLeft: 4, fontWeight: '600' },
  createButton: { backgroundColor: COLORS.primaryBlue, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 35, elevation: 3 },
  disabledButton: { opacity: 0.7 },
  createButtonText: { color: COLORS.bgWhite, fontSize: 16, fontWeight: 'bold' }
});

export default CreateGroupScreen;