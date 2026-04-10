import * as SecureStore from 'expo-secure-store';
import { useTranslation } from 'react-i18next';
import React, { useState, useRef, useEffect } from 'react'; 
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
  Image,
  Modal
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context'; 
import * as LocalAuthentication from 'expo-local-authentication'; 
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import api from '../services/api';
import { COLORS } from '../constants/theme'; 

const LANGUAGES = [
  { code: 'en', label: 'English' }, { code: 'hi', label: 'Hindi (हिंदी)' }, { code: 'mr', label: 'Marathi (मराठी)' },
  { code: 'gu', label: 'Gujarati (ગુજરાતી)' }, { code: 'ta', label: 'Tamil (தமிழ்)' }, { code: 'te', label: 'Telugu (తెలుగు)' },
  { code: 'kn', label: 'Kannada (ಕನ್ನಡ)' }, { code: 'ml', label: 'Malayalam (മലയാളം)' }, { code: 'bn', label: 'Bengali (বাংলা)' },
  { code: 'pa', label: 'Punjabi (ਪੰਜਾਬੀ)' }, { code: 'or', label: 'Odia (ଓଡ଼ିଆ)' }, { code: 'as', label: 'Assamese (অসমীয়া)' },
  { code: 'ur', label: 'Urdu (اردو)' }
];

const LoginScreen = ({ navigation }) => {
  const { t, i18n } = useTranslation(); 
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  const [isRegistering, setIsRegistering] = useState(false); 
  const [language, setLanguage] = useState(i18n.language || 'en'); 
  const [loading, setLoading] = useState(false);
  const [isCheckingBiometrics, setIsCheckingBiometrics] = useState(true);
  const [errors, setErrors] = useState({});
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // --- FORGOT PASSWORD STATES ---
  const [forgotPasswordStep, setForgotPasswordStep] = useState(0); // 0: Hidden, 1: Enter Email, 2: Enter OTP & New Password
  const [resetOtp, setResetOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [supportModalVisible, setSupportModalVisible] = useState(false);

  const nameRef = useRef(null);
  const phoneRef = useRef(null);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  useEffect(() => {
    checkLocalAuth();
  }, []);

  const checkLocalAuth = async () => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (token) {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        
        if (hasHardware && isEnrolled) {
          const authResult = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Unlock Bharat Bachat',
            fallbackLabel: 'Use Device Passcode',
          });

          if (authResult.success) {
            navigation.replace('MainTabs');
            return;
          } else {
            await SecureStore.deleteItemAsync('userToken');
          }
        } else {
          navigation.replace('MainTabs');
          return;
        }
      }
    } catch (e) {
      console.log("Biometric check failed", e);
    } finally {
      setIsCheckingBiometrics(false);
    }
  };

  const handleAuth = async () => {
    if (!agreedToTerms) {
      return Alert.alert(t('common.actionRequired', "Action Required"), t('authAlerts.termsAgreePrompt', "You must agree to the Terms of Service & Privacy Policy to continue."));
    }

    let newErrors = {};
    if (!email) newErrors.email = t('errors.invalidEmail', "Please enter a valid email address.");
    if (!password) newErrors.password = t('errors.emptyPassword', "Please enter your password.");
    
    if (isRegistering) {
        if (!name) newErrors.name = t('errors.emptyName', "Please enter the full name.");
        if (!phone || phone.length !== 10) newErrors.phone = t('errors.invalidPhone', "Please enter a valid 10-digit mobile number.");
        if (password.length < 6) newErrors.password = t('errors.shortPassword', "Password must be at least 6 characters long.");
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return; 
    }

    setLoading(true);
    setErrors({}); 
    
    try {
      const endpoint = isRegistering ? '/register' : '/login-password';
      const payload = isRegistering 
        ? { name, email: email.trim().toLowerCase(), phone, password, language } 
        : { email: email.trim().toLowerCase(), password };

      const response = await api.post(endpoint, payload);
      
      await SecureStore.setItemAsync('userToken', response.data.access_token);
      navigation.replace('MainTabs');
    } catch (error) {
      const errorMsg = error.response?.data?.message || t('authAlerts.loginFailed', "Invalid credentials or email already exists.");
      Alert.alert(t('common.error', "Error"), errorMsg);
    } finally {
      setLoading(false);
    }
  };

  // --- FORGOT PASSWORD FUNCTIONS ---
  const handleSendResetOtp = async () => {
    if (!email.trim()) {
      return setErrors({ email: "Please enter your registered email address." });
    }
    setLoading(true);
    setErrors({});
    try {
      // Reusing your existing send-otp endpoint
      await api.post('/send-otp', { email: email.trim().toLowerCase() });
      setForgotPasswordStep(2);
      Alert.alert("OTP Sent", "Please check your email for the password reset code.");
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Failed to send reset code. Make sure the email is registered.");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (resetOtp.length !== 4) return setErrors({ resetOtp: "Enter a valid 4-digit OTP." });
    if (newPassword.length < 6) return setErrors({ newPassword: "Password must be at least 6 characters." });

    setLoading(true);
    setErrors({});
    try {
      await api.post('/reset-password', { 
        email: email.trim().toLowerCase(), 
        otp: Number(resetOtp), 
        new_password: newPassword 
      });
      
      Alert.alert("Success", "Password reset successfully. You can now login.");
      setForgotPasswordStep(0);
      setPassword('');
      setResetOtp('');
      setNewPassword('');
    } catch (error) {
      Alert.alert("Error", error.response?.data?.message || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (isCheckingBiometrics) {
    return (
      <View style={[styles.safeArea, {justifyContent: 'center', alignItems: 'center'}]}>
        <Image source={require('../../assets/icon.png')} style={{width: 80, height: 80, marginBottom: 20}} resizeMode="contain" />
        <ActivityIndicator size="large" color={COLORS.primaryBlue} />
        <Text style={{marginTop: 15, color: COLORS.textGray, fontWeight: 'bold'}}>Securing session...</Text>
      </View>
    );
  }

  // --- FORGOT PASSWORD UI FLOW ---
  if (forgotPasswordStep > 0) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            <TouchableOpacity onPress={() => setForgotPasswordStep(0)} style={{ marginBottom: 20 }}>
              <Ionicons name="arrow-back" size={28} color={COLORS.textDark} />
            </TouchableOpacity>

            <Text style={{ fontSize: 24, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 10 }}>
              {forgotPasswordStep === 1 ? "Reset Password" : "Create New Password"}
            </Text>
            <Text style={{ fontSize: 15, color: COLORS.textGray, marginBottom: 30 }}>
              {forgotPasswordStep === 1 
                ? "Enter your registered email address to receive a 4-digit verification code." 
                : `We sent a code to ${email}. Enter it below along with your new password.`}
            </Text>

            {forgotPasswordStep === 1 && (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Registered Email Address</Text>
                  <View style={[styles.iconInputRow, errors.email && styles.errorBorder]}>
                    <Ionicons name="mail-outline" size={20} color={COLORS.textMuted} />
                    <TextInput 
                      style={styles.input} 
                      placeholder="email@example.com" 
                      placeholderTextColor={COLORS.textMuted}
                      value={email} 
                      onChangeText={(text) => { setEmail(text); setErrors({}); }} 
                      keyboardType="email-address" 
                      autoCapitalize="none" 
                    />
                  </View>
                  {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                </View>

                <TouchableOpacity style={styles.button} onPress={handleSendResetOtp} disabled={loading}>
                  {loading ? <ActivityIndicator color={COLORS.bgWhite} /> : <Text style={styles.buttonText}>Send OTP</Text>}
                </TouchableOpacity>

                <TouchableOpacity style={{ marginTop: 25, alignItems: 'center' }} onPress={() => setSupportModalVisible(true)}>
                  <Text style={{ color: COLORS.textGray, fontWeight: 'bold', textDecorationLine: 'underline' }}>
                    Didn't use a real email? Try another way.
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {forgotPasswordStep === 2 && (
              <>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Enter 4-Digit OTP</Text>
                  <TextInput 
                    style={[styles.otpInput, errors.resetOtp && styles.errorBorder]} 
                    placeholder="0 0 0 0" 
                    placeholderTextColor={COLORS.textMuted}
                    value={resetOtp} 
                    onChangeText={(text) => { setResetOtp(text); setErrors({}); }} 
                    keyboardType="number-pad" 
                    maxLength={4}
                  />
                  {errors.resetOtp && <Text style={[styles.errorText, {textAlign: 'center'}]}>{errors.resetOtp}</Text>}
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>New Password</Text>
                  <View style={[styles.iconInputRow, errors.newPassword && styles.errorBorder]}>
                    <Ionicons name="lock-closed-outline" size={20} color={COLORS.textMuted} />
                    <TextInput 
                      style={styles.input} 
                      placeholder="********" 
                      placeholderTextColor={COLORS.textMuted}
                      value={newPassword} 
                      onChangeText={(text) => { setNewPassword(text); setErrors({}); }} 
                      secureTextEntry 
                    />
                  </View>
                  {errors.newPassword && <Text style={styles.errorText}>{errors.newPassword}</Text>}
                </View>

                <TouchableOpacity style={styles.button} onPress={handleResetPassword} disabled={loading}>
                  {loading ? <ActivityIndicator color={COLORS.bgWhite} /> : <Text style={styles.buttonText}>Reset Password</Text>}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* DUMMY EMAIL FALLBACK MODAL */}
        <Modal visible={supportModalVisible} transparent={true} animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Account Recovery</Text>
                <TouchableOpacity onPress={() => setSupportModalVisible(false)}><Ionicons name="close" size={24} color={COLORS.textDark} /></TouchableOpacity>
              </View>
              <View style={{ backgroundColor: '#fff4e5', padding: 15, borderRadius: 10, marginBottom: 20 }}>
                <Text style={{ color: '#b45309', fontSize: 14, lineHeight: 22 }}>
                  If you registered with a <Text style={{fontWeight: 'bold'}}>dummy email address</Text> and forgot your password, you cannot receive the reset OTP automatically.
                </Text>
              </View>
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.textDark, marginBottom: 10 }}>How to recover your account:</Text>
              <Text style={{ fontSize: 15, color: COLORS.textGray, marginBottom: 8 }}>1. Ask your <Text style={{fontWeight: 'bold'}}>Gat Pramukh (Admin)</Text> to contact support on your behalf.</Text>
              <Text style={{ fontSize: 15, color: COLORS.textGray, marginBottom: 25 }}>2. Or email us directly from your working email address at <Text style={{fontWeight: 'bold', color: COLORS.primaryBlue}}>bharatbachat@sarvashikshan.com</Text> providing your registered phone number.</Text>
              
              <TouchableOpacity style={[styles.button, { width: '100%', marginTop: 0 }]} onPress={() => setSupportModalVisible(false)}>
                <Text style={styles.buttonText}>Understood</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </SafeAreaView>
    );
  }

  // --- STANDARD LOGIN / REGISTER UI ---
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          
          <View style={styles.logoContainer}>
              <Image source={require('../../assets/logo.png')} style={styles.logoImage} resizeMode="contain" />
          </View>
          
          <Text style={styles.subtitle}>
              {isRegistering ? t('login.subtitleRegister', 'Create your account') : t('login.subtitleLogin', 'Manage your Bachat Gat')}
          </Text>

          {isRegistering && (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('login.fullName', 'Full Name')}</Text>
                <View style={[styles.iconInputRow, errors.name && styles.errorBorder]}>
                  <Ionicons name="person-outline" size={20} color={errors.name ? COLORS.danger : COLORS.textMuted} />
                  <TextInput 
                    ref={nameRef} style={styles.input} placeholder={t('login.fullName', 'Enter Full Name')} 
                    placeholderTextColor={COLORS.textMuted} value={name} 
                    onChangeText={(text) => { setName(text); setErrors({...errors, name: null}); }} 
                    returnKeyType="next" onSubmitEditing={() => phoneRef.current?.focus()} blurOnSubmit={false}
                  />
                </View>
                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('login.mobileNumber', 'Mobile Number')}</Text>
                <View style={[styles.iconInputRow, errors.phone && styles.errorBorder]}>
                  <Ionicons name="call-outline" size={20} color={errors.phone ? COLORS.danger : COLORS.textMuted} />
                  <TextInput 
                    ref={phoneRef} style={styles.input} placeholder="10 Digits" 
                    placeholderTextColor={COLORS.textMuted} value={phone} 
                    onChangeText={(text) => { setPhone(text); setErrors({...errors, phone: null}); }} 
                    keyboardType="numeric" maxLength={10} returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()} blurOnSubmit={false}
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
                ref={emailRef} style={styles.input} placeholder="email@example.com" 
                placeholderTextColor={COLORS.textMuted} value={email} 
                onChangeText={(text) => { setEmail(text); setErrors({...errors, email: null}); }} 
                keyboardType="email-address" autoCapitalize="none" returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()} blurOnSubmit={false}
              />
            </View>
            {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
          </View>

          <View style={styles.inputContainer}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={[styles.label, {marginBottom: 0}]}>{isRegistering ? t('login.setPassword', 'Set Password') : t('login.password', 'Password')}</Text>
                {!isRegistering && (
                  <TouchableOpacity onPress={() => setForgotPasswordStep(1)}>
                    <Text style={{ color: COLORS.primaryBlue, fontSize: 13, fontWeight: 'bold' }}>Forgot Password?</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={[styles.iconInputRow, errors.password && styles.errorBorder]}>
                <Ionicons name="lock-closed-outline" size={20} color={errors.password ? COLORS.danger : COLORS.textMuted} />
                <TextInput 
                  ref={passwordRef} style={styles.input} placeholder="********" 
                  placeholderTextColor={COLORS.textMuted} value={password} 
                  onChangeText={(text) => { setPassword(text); setErrors({...errors, password: null}); }} 
                  secureTextEntry returnKeyType="done" onSubmitEditing={handleAuth} 
                />
              </View>
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
          </View>

          {!isRegistering && (
            <View style={styles.inputContainer}>
                <Text style={styles.label}>{t('login.language', 'Language')}</Text>
                <View style={styles.pickerWrapper}>
                    <Picker selectedValue={language} onValueChange={(itemValue) => { setLanguage(itemValue); i18n.changeLanguage(itemValue); }} style={styles.picker}>
                        {LANGUAGES.map((lang) => (<Picker.Item key={lang.code} label={lang.label} value={lang.code} />))}
                    </Picker>
                </View>
            </View>
          )}

          <View style={styles.consentContainer}>
            <TouchableOpacity onPress={() => setAgreedToTerms(!agreedToTerms)}>
              <Ionicons name={agreedToTerms ? "checkbox" : "square-outline"} size={24} color={agreedToTerms ? COLORS.primaryBlue : COLORS.textMuted} />
            </TouchableOpacity>
            <View style={styles.consentTextContainer}>
              <Text style={styles.consentText}>{t('login.iAgreeTo', 'I agree to the ')}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('TermsScreen')}>
                <Text style={styles.consentLink}>{t('login.termsLink', 'Terms of Service & Privacy Policy')}</Text>
              </TouchableOpacity>
            </View>
          </View>

          <TouchableOpacity style={styles.button} onPress={handleAuth} disabled={loading}>
            {loading ? <ActivityIndicator color={COLORS.bgWhite} /> : <Text style={styles.buttonText}>{isRegistering ? t('login.btnRegister', 'Register') : t('login.btnLogin', 'Login Now')}</Text>}
          </TouchableOpacity>

          <View style={styles.footer}>
              <TouchableOpacity onPress={() => { setIsRegistering(!isRegistering); setErrors({}); }}>
                  <Text style={styles.toggleText}>{isRegistering ? t('login.toggleLogin', 'Already have an account? Login') : t('login.toggleRegister', 'New User? Register Now')}</Text>
              </TouchableOpacity>
          </View>

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
  errorText: { color: COLORS.danger, fontSize: 13, marginTop: 6, marginLeft: 4, fontWeight: '500' },
  errorBorder: { borderColor: COLORS.danger, borderWidth: 1.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.bgWhite, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: COLORS.textDark }
});

export default LoginScreen;