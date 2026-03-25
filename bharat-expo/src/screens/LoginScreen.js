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
  KeyboardAvoidingView,
  Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 

import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { COLORS } from '../constants/theme'; 

const LoginScreen = ({ navigation }) => {
  const { t, i18n } = useTranslation(); 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  const [isRegistering, setIsRegistering] = useState(false); 
  const [usePasswordLogin, setUsePasswordLogin] = useState(false); 
  
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [language, setLanguage] = useState(i18n.language || 'en'); 
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [agreedToTerms, setAgreedToTerms] = useState(false);

  const nameRef = useRef(null);
  const phoneRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const handlePasswordLogin = async () => {
    if (!agreedToTerms) {
      Alert.alert(t('common.actionRequired', "Action Required"), t('authAlerts.termsAgreePrompt', "You must agree to the Terms of Service & Privacy Policy to continue."));
      return;
    }

    let newErrors = {};
    if (!email) newErrors.email = t('errors.invalidEmail', "Please enter a valid email address.");
    if (!password) newErrors.password = t('errors.emptyPassword', "Please enter your password.");

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
      navigation.replace('MainTabs');
    } catch (error) {
      Alert.alert(t('authAlerts.loginFailed', "Login Failed"), t('authAlerts.invalidCreds', "Invalid email or password."));
    } finally {
      setLoading(false);
    }
  };

  const handleSendOtp = async () => {
    if (!agreedToTerms) {
      Alert.alert(t('common.actionRequired', "Action Required"), t('authAlerts.termsAgreePrompt', "You must agree to the Terms of Service & Privacy Policy to continue."));
      return;
    }

    let newErrors = {};
    if (!email) newErrors.email = t('errors.invalidEmail', "Please enter a valid email address.");
    
    if (isRegistering) {
        if (!name) newErrors.name = t('errors.emptyName', "Please enter the full name.");
        if (!phone || phone.length !== 10) newErrors.phone = t('errors.invalidPhone', "Please enter a valid 10-digit mobile number.");
        if (!password) {
          newErrors.password = t('errors.emptyPassword', "Please enter your password.");
        } else if (password.length < 6) {
          newErrors.password = t('errors.shortPassword', "Password must be at least 6 characters long.");
        }
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

        await api.post('/send-otp', payload);
        
        // Success
        setOtpSent(true);
        Alert.alert(t('authAlerts.otpSent', "OTP Sent"), t('authAlerts.otpSentDesc', "Please check your email for the 4-digit OTP."));

    } catch (error) {
        // --- THE FIX: SMART NETWORK TIMEOUT INTERCEPT ---
        if (error.message === 'Network Error' || error.code === 'ECONNABORTED' || error.response?.status === 504) {
          setOtpSent(true); // Force OTP input to show anyway!
          Alert.alert(t('authAlerts.notice', "Notice"), "The network is slow, but your OTP might have been sent. Please check your inbox in a few seconds.");
        } 
        else if (error.response && error.response.data && error.response.data.message) {
            const serverMessage = error.response.data.message;
            if (serverMessage.includes('New user')) {
                setIsRegistering(true); 
                Alert.alert(t('authAlerts.welcome', "Welcome!"), t('authAlerts.welcomeDesc', "Looks like you are new here. Please fill in your details to create an account."));
            } else {
                Alert.alert(t('authAlerts.notice', "Notice"), serverMessage || t('authAlerts.valError', "Validation Error"));
            }
        } 
        else {
            Alert.alert(t('common.error', 'Error'), "Failed to send OTP.");
        }
    } finally {
        setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
     let newErrors = {};
     if (!otpInput) newErrors.otpInput = t('errors.emptyOtp', "Please enter the 4-digit OTP.");

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
            language: language 
        });
        await SecureStore.setItemAsync('userToken', response.data.access_token);
        navigation.replace('MainTabs');
     } catch (error) {
        Alert.alert(t('common.error', "Error"), t('authAlerts.invalidOtp', "Invalid OTP. Please try again."));
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
              <Image 
                source={require('../../assets/logo.png')} 
                style={styles.logoImage} 
                resizeMode="contain" 
              />
          </View>
          
          <Text style={styles.subtitle}>
              {isRegistering 
                ? t('login.subtitleRegister', 'Create your account') 
                : t('login.subtitleLogin', 'Manage your Bachat Gat')}
          </Text>

          {isRegistering && !otpSent && (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('login.fullName', 'Full Name')}</Text>
                <View style={[styles.iconInputRow, errors.name && styles.errorBorder]}>
                  <Ionicons name="person-outline" size={20} color={errors.name ? COLORS.danger : COLORS.textMuted} />
                  <TextInput 
                    ref={nameRef}
                    style={styles.input} 
                    placeholder={t('login.fullName', 'Enter Full Name')} 
                    placeholderTextColor={COLORS.textMuted}
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
                  <Ionicons name="call-outline" size={20} color={errors.phone ? COLORS.danger : COLORS.textMuted} />
                  <TextInput 
                    ref={phoneRef}
                    style={styles.input} 
                    placeholder="10 Digits" 
                    placeholderTextColor={COLORS.textMuted}
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

          <View style={styles.inputContainer}>
            <Text style={styles.label}>{t('login.emailLabel', 'Email Address')}</Text>
            <View style={[styles.iconInputRow, errors.email && styles.errorBorder]}>
              <Ionicons name="mail-outline" size={20} color={errors.email ? COLORS.danger : COLORS.textMuted} />
              <TextInput 
                ref={emailRef}
                style={styles.input} 
                placeholder="email@example.com" 
                placeholderTextColor={COLORS.textMuted}
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

          {(isRegistering || usePasswordLogin) && !otpSent && (
            <View style={styles.inputContainer}>
                <Text style={styles.label}>
                  {isRegistering ? t('login.setPassword', 'Set Password') : t('login.password', 'Password')}
                </Text>
                <View style={[styles.iconInputRow, errors.password && styles.errorBorder]}>
                  <Ionicons name="lock-closed-outline" size={20} color={errors.password ? COLORS.danger : COLORS.textMuted} />
                  <TextInput 
                    ref={passwordRef}
                    style={styles.input} 
                    placeholder="********" 
                    placeholderTextColor={COLORS.textMuted}
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

          {!otpSent && !isRegistering && !usePasswordLogin && (
            <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('login.language', 'Language')}</Text>
                <View style={styles.pickerWrapper}>
                    <Picker 
                      selectedValue={language} 
                      onValueChange={(itemValue) => {
                        setLanguage(itemValue);
                        i18n.changeLanguage(itemValue); 
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

          {otpSent && (
             <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('login.enterOtp', 'Enter 4-Digit OTP')}</Text>
                <TextInput 
                  style={[styles.otpInput, errors.otpInput && styles.errorBorder]} 
                  placeholder="0 0 0 0" 
                  placeholderTextColor={COLORS.textMuted}
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

          {!otpSent && (
            <View style={styles.consentContainer}>
              <TouchableOpacity onPress={() => setAgreedToTerms(!agreedToTerms)}>
                <Ionicons 
                  name={agreedToTerms ? "checkbox" : "square-outline"} 
                  size={24} 
                  color={agreedToTerms ? COLORS.primaryBlue : COLORS.textMuted} 
                />
              </TouchableOpacity>
              <View style={styles.consentTextContainer}>
                <Text style={styles.consentText}>{t('login.iAgreeTo', 'I agree to the ')}</Text>
                <TouchableOpacity onPress={() => navigation.navigate('TermsScreen')}>
                  <Text style={styles.consentLink}>
                    {t('login.termsLink', 'Terms of Service & Privacy Policy')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity 
            style={styles.button} 
            onPress={otpSent ? handleVerifyOtp : (usePasswordLogin ? handlePasswordLogin : handleSendOtp)}
          >
            {loading ? <ActivityIndicator color={COLORS.bgWhite} /> : (
                <Text style={styles.buttonText}>
                    {otpSent 
                      ? t('login.btnVerify', 'Verify & Login') 
                      : (usePasswordLogin ? t('login.btnLogin', 'Login Now') : t('login.btnGetOtp', 'Get OTP'))}
                </Text>
            )}
          </TouchableOpacity>

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
  safeArea: { flex: 1, backgroundColor: COLORS.bgWhite, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  container: { flexGrow: 1, padding: 24, backgroundColor: COLORS.bgWhite, justifyContent: 'center' },
  
  logoContainer: { alignSelf: 'center', marginBottom: 10, marginTop: 10 },
  logoImage: { width: 280, height: 180 },

  subtitle: { fontSize: 16, color: COLORS.textGray, textAlign: 'center', marginBottom: 30 },
  inputContainer: { marginBottom: 18 },
  label: { fontSize: 14, color: COLORS.textDark, marginBottom: 8, fontWeight: '600' },
  iconInputRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bgLight, borderRadius: 10, paddingHorizontal: 15, borderWidth: 1, borderColor: COLORS.borderLight },
  input: { flex: 1, padding: 15, fontSize: 16, color: COLORS.textDark },
  otpInput: { backgroundColor: COLORS.bgLight, borderRadius: 10, padding: 15, fontSize: 24, textAlign: 'center', letterSpacing: 10, borderWidth: 1, borderColor: COLORS.primaryBlue, color: COLORS.textDark },
  pickerWrapper: { backgroundColor: COLORS.bgLight, borderRadius: 10, borderWidth: 1, borderColor: COLORS.borderLight, overflow: 'hidden'},
  picker: { height: 55, color: COLORS.textDark },
  
  consentContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 5, paddingHorizontal: 5 },
  consentTextContainer: { flex: 1, marginLeft: 10, flexDirection: 'row', flexWrap: 'wrap' },
  consentText: { color: COLORS.textGray, fontSize: 13 },
  consentLink: { color: COLORS.primaryBlue, fontSize: 13, fontWeight: 'bold', textDecorationLine: 'underline' },

  button: { backgroundColor: COLORS.primaryBlue, padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10, elevation: 2 },
  buttonText: { color: COLORS.bgWhite, fontSize: 18, fontWeight: 'bold' },
  footer: { marginTop: 25 },
  toggleText: { textAlign: 'center', color: COLORS.primaryBlue, fontWeight: 'bold', fontSize: 16 },
  secondaryToggle: { textAlign: 'center', color: COLORS.textMuted, fontWeight: '500', fontSize: 14 },
  errorText: { color: COLORS.danger, fontSize: 13, marginTop: 6, marginLeft: 4, fontWeight: '500' },
  errorBorder: { borderColor: COLORS.danger, borderWidth: 1.5 }
});

export default LoginScreen;