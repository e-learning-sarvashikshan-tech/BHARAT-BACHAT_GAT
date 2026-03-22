import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import api from '../services/api';
import { COLORS } from '../constants/theme'; // <-- BRAND THEME IMPORTED

const JoinGroupScreen = ({ navigation }) => {
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleJoinGroup = async () => {
    if (inviteCode.trim().length < 5) {
      Alert.alert("Invalid Code", "Please enter a valid Invite Code.");
      return;
    }

    setLoading(true);

    try {
      const token = await SecureStore.getItemAsync('userToken');
      
      const response = await api.post('/group/join', 
        { invite_code: inviteCode.trim().toUpperCase() }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.status === 'success') {
        Alert.alert(
          "Success!", 
          `Your request to join has been sent to the Admins. You will be added once they approve.`,
          [{ text: "OK", onPress: () => navigation.navigate('Dashboard') }]
        );
      }
    } catch (error) {
      console.error("Join Group Error:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to join group. Check the code and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Join a Bachat Gat</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.content}>
          <View style={styles.iconWrapper}>
            <Ionicons name="people-circle" size={80} color={COLORS.primaryBlue} />
          </View>
          
          <Text style={styles.title}>Enter Invite Code</Text>
          <Text style={styles.subtitle}>Ask your Gat Adhyaksha (Group Admin) for the 6-character secret code to join their group.</Text>

          <View style={styles.inputContainer}>
            <Ionicons name="key-outline" size={20} color={COLORS.textMuted} style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="e.g., 1EC973"
              placeholderTextColor={COLORS.textMuted}
              value={inviteCode}
              onChangeText={setInviteCode}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
            />
          </View>

          <TouchableOpacity 
            style={[styles.joinButton, (inviteCode.length < 5 || loading) && styles.disabledButton]} 
            onPress={handleJoinGroup}
            disabled={inviteCode.length < 5 || loading}
          >
            {loading ? <ActivityIndicator color={COLORS.bgWhite} /> : <Text style={styles.joinButtonText}>Request to Join</Text>}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bgWhite },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: COLORS.borderLight },
  backButton: { marginRight: 15 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textDark },
  
  content: { flex: 1, padding: 30, alignItems: 'center', justifyContent: 'center', marginTop: -50 },
  iconWrapper: { marginBottom: 20, backgroundColor: COLORS.primaryBlueLight, borderRadius: 50, padding: 10 },
  title: { fontSize: 24, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 10 },
  subtitle: { fontSize: 14, color: COLORS.textGray, textAlign: 'center', marginBottom: 40, lineHeight: 22 },
  
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgLight, borderRadius: 12, paddingHorizontal: 15, width: '100%', marginBottom: 25, borderWidth: 1, borderColor: COLORS.borderLight },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, height: 60, fontSize: 18, fontWeight: 'bold', color: COLORS.textDark, letterSpacing: 2 },
  
  joinButton: { backgroundColor: COLORS.primaryBlue, width: '100%', height: 55, borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 2 },
  disabledButton: { opacity: 0.6 },
  joinButtonText: { color: COLORS.bgWhite, fontSize: 18, fontWeight: 'bold' }
});

export default JoinGroupScreen;