import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import * as SecureStore from 'expo-secure-store';
import { COLORS } from '../constants/theme'; // <-- BRAND THEME IMPORTED

const AddMemberScreen = ({ route, navigation }) => {
  const { groupId } = route.params; 

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAddMember = async () => {
    if (!name.trim()) {
      Alert.alert("Missing Info", "Please enter the member's full name.");
      return;
    }

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      Alert.alert("Invalid Number", "Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.");
      return;
    }

    setLoading(true);
    try {
      const token = await SecureStore.getItemAsync('userToken');
      
      const payload = {
        group_id: groupId,
        name: name.trim(),
        phone: phone.trim()
      };

      if (email.trim()) {
        payload.email = email.trim();
      }

      const response = await api.post('/members/add', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      Alert.alert("Success", "Member added successfully!");
      navigation.goBack(); 

    } catch (error) {
      console.error("Failed to add member:", error);
      const errorMessage = error.response?.data?.message || "Make sure this phone number isn't already registered in this group.";
      Alert.alert("Could Not Add Member", errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Member</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.formContainer}>
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={24} color={COLORS.primaryBlue} />
          <Text style={styles.infoText}>
            You can add members using just their mobile number. If they ever download the app, they can log in using this number!
          </Text>
        </View>

        <Text style={styles.label}>Full Name *</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="person-outline" size={20} color={COLORS.textMuted} style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Enter member's name"
            placeholderTextColor={COLORS.textMuted}
            value={name}
            onChangeText={setName}
          />
        </View>

        <Text style={styles.label}>Mobile Number * (10 Digits)</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="call-outline" size={20} color={COLORS.textMuted} style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="e.g. 9876543210"
            placeholderTextColor={COLORS.textMuted}
            value={phone}
            onChangeText={setPhone}
            keyboardType="numeric"
            maxLength={10} 
          />
        </View>

        <Text style={styles.label}>Email Address (Optional)</Text>
        <View style={styles.inputContainer}>
          <Ionicons name="mail-outline" size={20} color={COLORS.textMuted} style={styles.icon} />
          <TextInput
            style={styles.input}
            placeholder="Enter email if available"
            placeholderTextColor={COLORS.textMuted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <TouchableOpacity 
          style={styles.submitButton} 
          onPress={handleAddMember}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.bgWhite} />
          ) : (
            <Text style={styles.submitButtonText}>Save Member</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgLight },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 50, backgroundColor: COLORS.bgWhite, elevation: 2, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textDark },
  backButton: { padding: 5 },
  formContainer: { padding: 20, marginTop: 10 },
  infoBox: { flexDirection: 'row', backgroundColor: COLORS.primaryBlueLight, padding: 15, borderRadius: 12, marginBottom: 25, alignItems: 'center' },
  infoText: { flex: 1, marginLeft: 10, fontSize: 13, color: COLORS.primaryBlue, lineHeight: 18 },
  label: { fontSize: 14, fontWeight: 'bold', color: COLORS.textGray, marginBottom: 8, marginLeft: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgWhite, borderRadius: 10, paddingHorizontal: 15, marginBottom: 20, elevation: 1, borderWidth: 1, borderColor: COLORS.borderLight },
  icon: { marginRight: 10 },
  input: { flex: 1, paddingVertical: 15, fontSize: 16, color: COLORS.textDark },
  submitButton: { backgroundColor: COLORS.primaryBlue, padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10, elevation: 3 },
  submitButtonText: { color: COLORS.bgWhite, fontSize: 18, fontWeight: 'bold' }
});

export default AddMemberScreen;