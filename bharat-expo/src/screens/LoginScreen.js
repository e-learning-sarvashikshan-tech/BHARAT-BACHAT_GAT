import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
import React, { useState, useRef } from 'react'; 
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Alert, 
  ScrollView, 
  ActivityIndicator,
  Platform,        
  StatusBar,
  KeyboardAvoidingView 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 

import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';

const LoginScreen = ({ navigation }) => {
  const { t, i18n } = useTranslation(); // <-- TRANSLATION HOOK
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  const [isRegistering, setIsRegistering] = useState(false); 
  const [usePasswordLogin, setUsePasswordLogin] = useState(false); 
  
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [language, setLanguage] = useState(i18n.language || 'en'); // Default to current i18n language
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const nameRef = useRef(null);
  const phoneRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const handlePasswordLogin = async () => {
    let newErrors = {};
    if (!email) newErrors.email = "Email is required";
    if (!password) newErrors.password = "Password is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return; 
    }

    setLoading(true);
    setErrors({}); 
    try {
      const response = await api.post('/login-password', { 
        email: email.trim(), 
        password: password 
      });
      
      await SecureStore.setItemAsync('userToken', response.data.access_token);
      navigation.replace('Dashboard');
    } catch (error) {
      Alert.alert("Login Failed", "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    let newErrors = {};
    if (!email) newErrors.email = "Email is required";
    
    if (isRegistering) {
        if (!name) newErrors.name = "Full name is required";
        if (!phone || phone.length !== 10) newErrors.phone = "Valid 10-digit mobile number is required";
        if (!password) newErrors.password = "Password is required";
    }

    if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return; 
    }
    
    setLoading(true);
    setErrors({}); 
    try {
        const payload = { 
            email: email.trim().toLowerCase(),
            name: isRegistering ? name : null,
            phone: isRegistering ? phone : null,
            password: isRegistering ? password : null, 
        };

        const response = await api.post('/send-otp', payload);
        setOtpSent(true);
        
        Alert.alert("OTP Sent", "Please check your email for the 4-digit OTP.");

    } catch (error) {
        if (!error.response) {
            Alert.alert("Connection Error", "Cannot reach the server. Please check your internet connection.");
        } else {
            const serverMessage = error.response.data.message;
            
            if (serverMessage && serverMessage.includes('New user')) {
                setIsRegistering(true); 
                Alert.alert("Welcome!", "Looks like you are new here. Please fill in your details to create an account.");
            } else {
                Alert.alert("Notice", serverMessage || "Validation Error");
            }
        }
    } finally {
        setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
     let newErrors = {};
     if (!otpInput) newErrors.otpInput = "Please enter the 4-digit OTP";

     if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors);
        return;
     }

     setLoading(true);
     setErrors({});
     try {
        const response = await api.post('/verify-otp', {
            email: email.trim().toLowerCase(), 
            otp: Number(otpInput.trim()),      
            language: language // Sends selected language to backend!
        });
        await SecureStore.setItemAsync('userToken', response.data.access_token);
        navigation.replace('Dashboard');
     } catch (error) {
        Alert.alert("Error", "Invalid OTP. Please try again.");
     } finally {
        setLoading(false);
     }
  };

  const toggleMode = (mode) => {
    setErrors({});
    if (mode === 'register') {
        setIsRegistering(!isRegistering);
        setUsePasswordLogin(false);
    } else if (mode === 'password') {
        setUsePasswordLogin(!usePasswordLogin);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          contentContainerStyle={styles.container}
          keyboardShouldPersistTaps="handled" 
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.logoContainer}>
              <Text style={{fontSize: 40}}>💰</Text>
          </View>
          
          {/* TRANSLATED TITLES */}
          <Text style={styles.title}>{t('login.title', 'Bharat Bachat')}</Text>
          <Text style={styles.subtitle}>
              {isRegistering 
                ? t('login.subtitleRegister', 'Create your account') 
                : t('login.subtitleLogin', 'Manage your Bachat Gat')}
          </Text>

          {/* REGISTRATION SECTION */}
          {isRegistering && !otpSent && (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('login.fullName', 'Full Name')}</Text>
                <View style={[styles.iconInputRow, errors.name && styles.errorBorder]}>
                  <Ionicons name="person-outline" size={20} color={errors.name ? "#dc3545" : "#888"} />
                  <TextInput 
                    ref={nameRef}
                    style={styles.input} 
                    placeholder="Sanket Dhamne" 
                    value={name} 
                    onChangeText={(text) => { setName(text); setErrors({...errors, name: null}); }} 
                    returnKeyType="next"
                    onSubmitEditing={() => phoneRef.current?.focus()} 
                    blurOnSubmit={false}
                  />
                </View>
                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('login.mobileNumber', 'Mobile Number')}</Text>
                <View style={[styles.iconInputRow, errors.phone && styles.errorBorder]}>
                  <Ionicons name="call-outline" size={20} color={errors.phone ? "#dc3545" : "#888"} />
                  <TextInput 
                    ref={phoneRef}
                    style={styles.input} 
                    placeholder="10 Digits" 
                    value={phone} 
                    onChangeText={(text) => { setPhone(text); setErrors({...errors, phone: null}); }} 
                    keyboardType="numeric" 
                    maxLength={10} 
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()} 
                    blurOnSubmit={false}
                  />
                </View>
                {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
              </View>
            </>
          )}

          {/* EMAIL SECTION */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('login.emailLabel', 'Email Address')}</Text>
            <View style={[styles.iconInputRow, errors.email && styles.errorBorder]}>
              <Ionicons name="mail-outline" size={20} color={errors.email ? "#dc3545" : "#888"} />
              <TextInput 
                ref={emailRef}
                style={styles.input} 
                placeholder="email@example.com" 
                value={email} 
                onChangeText={(text) => { setEmail(text); setErrors({...errors, email: null}); }} 
                keyboardType="email-address" 
                autoCapitalize="none" 
                editable={!otpSent} 
                returnKeyType={(isRegistering || usePasswordLogin) ? "next" : "done"}
                onSubmitEditing={() => {
                  if (isRegistering || usePasswordLogin) {
                    passwordRef.current?.focus(); 
                  } else {
                    handleSendOtp(); 
                  }
                }}
                blurOnSubmit={!(isRegistering || usePasswordLogin)}
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          {/* PASSWORD SECTION */}
          {(isRegistering || usePasswordLogin) && !otpSent && (
            <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  {isRegistering ? t('login.setPassword', 'Set Password') : t('login.password', 'Password')}
                </Text>
                <View style={[styles.iconInputRow, errors.password && styles.errorBorder]}>
                  <Ionicons name="lock-closed-outline" size={20} color={errors.password ? "#dc3545" : "#888"} />
                  <TextInput 
                    ref={passwordRef}
                    style={styles.input} 
                    placeholder="********" 
                    value={password} 
                    onChangeText={(text) => { setPassword(text); setErrors({...errors, password: null}); }} 
                    secureTextEntry 
                    returnKeyType="done"
                    onSubmitEditing={isRegistering ? handleSendOtp : handlePasswordLogin} 
                  />
                </View>
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>
          )}

          {/* INSTANT LANGUAGE SELECTION */}
          {!otpSent && !isRegistering && !usePasswordLogin && (
            <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('login.language', 'Language')}</Text>
                <View style={styles.pickerWrapper}>
                    <Picker 
                      selectedValue={language} 
                      onValueChange={(itemValue) => {
                        setLanguage(itemValue);
                        i18n.changeLanguage(itemValue); // <-- INSTANTLY TRANSLATES THE UI
                      }} 
                      style={styles.picker}
                    >
                        <Picker.Item label="English" value="en" />
                        <Picker.Item label="Marathi (मराठी)" value="mr" />
                        <Picker.Item label="Hindi (हिंदी)" value="hi" />
                    </Picker>
                </View>
            </View>
          )}

          {/* OTP INPUT SECTION */}
          {otpSent && (
             <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('login.enterOtp', 'Enter 4-Digit OTP')}</Text>
                <TextInput 
                  style={[styles.otpInput, errors.otpInput && styles.errorBorder]} 
                  placeholder="0 0 0 0" 
                  value={otpInput} 
                  onChangeText={(text) => { setOtpInput(text); setErrors({...errors, otpInput: null}); }} 
                  keyboardType="number-pad" 
                  maxLength={4}
                  returnKeyType="done"
                  onSubmitEditing={handleVerifyOtp} 
                />
                {errors.otpInput && <Text style={[styles.errorText, {textAlign: 'center'}]}>{errors.otpInput}</Text>}
           </View>
          )}

          {/* ACTION BUTTON */}
          <TouchableOpacity 
            style={styles.button} 
            onPress={otpSent ? handleVerifyOtp : (usePasswordLogin ? handlePasswordLogin : handleSendOtp)}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
                <Text style={styles.buttonText}>
                    {otpSent 
                      ? t('login.btnVerify', 'Verify & Login') 
                      : (usePasswordLogin ? t('login.btnLogin', 'Login Now') : t('login.btnGetOtp', 'Get OTP'))}
                </Text>
            )}
          </TouchableOpacity>

          {/* FOOTER TOGGLES */}
          {!otpSent && (
            <View style={styles.footer}>
                <TouchableOpacity onPress={() => toggleMode('register')}>
                    <Text style={styles.toggleText}>
                        {isRegistering 
                          ? t('login.toggleLogin', 'Already have an account? Login') 
                          : t('login.toggleRegister', 'New User? Register Now')}
                    </Text>
                </TouchableOpacity>

                {!isRegistering && (
                    <TouchableOpacity onPress={() => toggleMode('password')} style={{marginTop: 15}}>
                        <Text style={styles.secondaryToggle}>
                            {usePasswordLogin 
                              ? t('login.toggleOtp', 'Login with OTP instead') 
                              : t('login.togglePassword', 'Login with Password instead')}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#fff', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  container: { flexGrow: 1, padding: 24, backgroundColor: '#fff', justifyContent: 'center' },
  logoContainer: { alignSelf: 'center', marginBottom: 20, backgroundColor: '#2952a3', padding: 20, borderRadius: 15},
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#888', textAlign: 'center', marginBottom: 30 },
  inputContainer: { marginBottom: 18 },
  label: { fontSize: 14, color: '#333', marginBottom: 8, fontWeight: '600' },
  iconInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f9fa', borderRadius: 10, paddingHorizontal: 15, borderWidth: 1, borderColor: '#eee' },
  input: { flex: 1, padding: 15, fontSize: 16, color: '#333' },
  otpInput: { backgroundColor: '#f8f9fa', borderRadius: 10, padding: 15, fontSize: 24, textAlign: 'center', letterSpacing: 10, borderWidth: 1, borderColor: '#2952a3' },
  pickerWrapper: { backgroundColor: '#f8f9fa', borderRadius: 10, borderWidth: 1, borderColor: '#eee', overflow: 'hidden'},
  picker: { height: 55 },
  button: { backgroundColor: '#2952a3', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10, elevation: 2 },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  footer: { marginTop: 25 },
  toggleText: { textAlign: 'center', color: '#2952a3', fontWeight: 'bold', fontSize: 16 },
  secondaryToggle: { textAlign: 'center', color: '#888', fontWeight: '500', fontSize: 14 },
  errorText: { color: '#dc3545', fontSize: 13, marginTop: 6, marginLeft: 4, fontWeight: '500' },
  errorBorder: { borderColor: '#dc3545', borderWidth: 1.5 }
});

export default LoginScreen;