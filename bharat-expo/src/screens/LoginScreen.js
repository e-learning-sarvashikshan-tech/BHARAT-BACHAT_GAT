import * as SecureStore from 'expo-secure-store';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import api from '../services/api';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    if(!email) { Alert.alert("Error", "Please enter an email"); return; }
    
    setLoading(true);
    try {
        const response = await api.post('/send-otp', { email: email });
        Alert.alert("Server Output", JSON.stringify(response.data));
        setOtpSent(true);
    } catch (error) {
        console.error("Login Error:", error);
        Alert.alert("Error", "Could not send OTP. Check console.");
    } finally {
        setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
     // 1. Automatically remove accidental spaces from the phone keyboard
     const cleanEmail = email.trim();
     const cleanOtp = otpInput.trim();

     if(!cleanOtp) { Alert.alert("Error", "Please enter the OTP"); return; }

     setLoading(true);
     try {
        const response = await api.post('/verify-otp', {
            email: cleanEmail,
            otp: cleanOtp,
            language: language
        });
        
        await SecureStore.setItemAsync('userToken', response.data.access_token);
        Alert.alert("Success", "You are logged in!");
        navigation.replace('Dashboard');
        
     } catch (error) {
        // 2. Force the app to show Laravel's exact error message
        console.error("Verification Error:", error.response?.data || error.message);
        
        // This will pop up on your screen with the exact database response
        Alert.alert(
            "Server Rejected", 
            JSON.stringify(error.response?.data || "Network error. Is the server running?")
        );
     } finally {
        setLoading(false);
     }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
          <Text style={{fontSize: 40}}>💰</Text>
      </View>
      
      <Text style={styles.title}>Bharat Bachat</Text>
      <Text style={styles.subtitle}>Sign in to manage your SHG</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!otpSent}
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Language</Text>
        <View style={styles.pickerWrapper}>
            <Picker
            selectedValue={language}
            onValueChange={(itemValue) => setLanguage(itemValue)}
            style={styles.picker}
            >
            <Picker.Item label="English" value="en" />
            <Picker.Item label="Marathi (मराठी)" value="mr" />
            </Picker>
        </View>
      </View>

      {otpSent && (
         <View style={styles.inputContainer}>
            <Text style={styles.label}>Enter OTP</Text>
            <TextInput
            style={styles.input}
            placeholder="Check backend terminal"
            value={otpInput}
            onChangeText={setOtpInput}
            keyboardType="number-pad"
            />
       </View>
      )}

      <TouchableOpacity style={styles.button} onPress={otpSent ? handleVerifyOtp : handleSendOtp}>
        <Text style={styles.buttonText}>
            {loading ? "Loading..." : (otpSent ? "Verify OTP" : "Get OTP")}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#fff', justifyContent: 'center' },
  logoContainer: { alignSelf: 'center', marginBottom: 30, backgroundColor: '#2952a3', padding: 20, borderRadius: 15},
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#888', textAlign: 'center', marginBottom: 40 },
  inputContainer: { marginBottom: 20 },
  label: { fontSize: 14, color: '#333', marginBottom: 8, fontWeight: '600' },
  input: { backgroundColor: '#f8f9fa', borderRadius: 10, padding: 15, fontSize: 16, borderWidth: 1, borderColor: '#eee' },
  pickerWrapper: { backgroundColor: '#f8f9fa', borderRadius: 10, borderWidth: 1, borderColor: '#eee', overflow: 'hidden'},
  picker: { height: 55 },
  button: { backgroundColor: '#2952a3', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});

export default LoginScreen;