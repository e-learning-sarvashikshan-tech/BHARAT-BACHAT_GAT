import * as SecureStore from 'expo-secure-store';
import React, { useState, useRef } from 'react'; // NEW: Imported useRef
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  
  const [isRegistering, setIsRegistering] = useState(false); 
  const [usePasswordLogin, setUsePasswordLogin] = useState(false); 
  
  const [otpSent, setOtpSent] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [language, setLanguage] = useState('en');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // NEW: Create refs for each input field
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
        
        // 1. REMOVED THE DEBUG OTP POPUP! 
        // Now it just tells the user to check their email.
        Alert.alert("OTP Sent", "Please check your email for the 4-digit OTP.");

    } catch (error) {
        if (!error.response) {
            Alert.alert("Connection Error", "Cannot reach the server. Please check your internet connection.");
        } else {
            const serverMessage = error.response.data.message;
            
            // 2. AUTO-REDIRECT TO REGISTRATION!
            // If Laravel tells us this is a new user, we automatically open the registration form.
            if (serverMessage && serverMessage.includes('New user')) {
                setIsRegistering(true); // Automatically open the Name, Phone, and Password fields
                Alert.alert("Welcome!", "Looks like you are new here. Please fill in your details to create an account.");
            } 
            // Handle other normal errors (like duplicate phone number)
            else {
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
        // NEW: Log exactly what is being sent to check for weird formatting
        console.log("SENDING OTP PAYLOAD:", { email: email.trim().toLowerCase(), otp: Number(otpInput.trim()) });

        const response = await api.post('/verify-otp', {
            email: email.trim().toLowerCase(), // NEW: Added toLowerCase()
            otp: Number(otpInput.trim()),      // NEW: Wrapped in Number()
            language: language
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
          
          <Text style={styles.title}>Bharat Bachat</Text>
          <Text style={styles.subtitle}>
              {isRegistering ? "Create your account" : "Manage your Bachat Gat"}
          </Text>

          {/* REGISTRATION SECTION */}
          {isRegistering && !otpSent && (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Full Name</Text>
                <View style={[styles.iconInputRow, errors.name && styles.errorBorder]}>
                  <Ionicons name="person-outline" size={20} color={errors.name ? "#dc3545" : "#888"} />
                  <TextInput 
                    ref={nameRef} // Assigned Ref
                    style={styles.input} 
                    placeholder="Sanket Dhamne" 
                    value={name} 
                    onChangeText={(text) => { setName(text); setErrors({...errors, name: null}); }} 
                    returnKeyType="next" // Shows 'Next' on keyboard
                    onSubmitEditing={() => phoneRef.current?.focus()} // Jumps to Phone
                    blurOnSubmit={false}
                  />
                </View>
                {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Mobile Number</Text>
                <View style={[styles.iconInputRow, errors.phone && styles.errorBorder]}>
                  <Ionicons name="call-outline" size={20} color={errors.phone ? "#dc3545" : "#888"} />
                  <TextInput 
                    ref={phoneRef} // Assigned Ref
                    style={styles.input} 
                    placeholder="10 Digits" 
                    value={phone} 
                    onChangeText={(text) => { setPhone(text); setErrors({...errors, phone: null}); }} 
                    keyboardType="numeric" 
                    maxLength={10} 
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()} // Jumps to Email
                    blurOnSubmit={false}
                  />
                </View>
                {errors.phone && <Text style={styles.errorText}>{errors.phone}</Text>}
              </View>
            </>
          )}

          {/* EMAIL SECTION */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email Address</Text>
            <View style={[styles.iconInputRow, errors.email && styles.errorBorder]}>
              <Ionicons name="mail-outline" size={20} color={errors.email ? "#dc3545" : "#888"} />
              <TextInput 
                ref={emailRef} // Assigned Ref
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
                    passwordRef.current?.focus(); // Jump to Password if needed
                  } else {
                    handleSendOtp(); // Or submit if it's just OTP login
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
                <Text style={styles.label}>{isRegistering ? "Set Password" : "Password"}</Text>
                <View style={[styles.iconInputRow, errors.password && styles.errorBorder]}>
                  <Ionicons name="lock-closed-outline" size={20} color={errors.password ? "#dc3545" : "#888"} />
                  <TextInput 
                    ref={passwordRef} // Assigned Ref
                    style={styles.input} 
                    placeholder="********" 
                    value={password} 
                    onChangeText={(text) => { setPassword(text); setErrors({...errors, password: null}); }} 
                    secureTextEntry 
                    returnKeyType="done"
                    onSubmitEditing={isRegistering ? handleSendOtp : handlePasswordLogin} // Submit form when done
                  />
                </View>
                {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
            </View>
          )}

          {/* LANGUAGE SELECTION */}
          {!otpSent && !isRegistering && !usePasswordLogin && (
            <View style={styles.inputContainer}>
                <Text style={styles.label}>Language</Text>
                <View style={styles.pickerWrapper}>
                    <Picker selectedValue={language} onValueChange={(itemValue) => setLanguage(itemValue)} style={styles.picker}>
                        <Picker.Item label="English" value="en" />
                        <Picker.Item label="Marathi (मराठी)" value="mr" />
                    </Picker>
                </View>
            </View>
          )}

          {/* OTP INPUT SECTION */}
          {otpSent && (
             <View style={styles.inputContainer}>
                <Text style={styles.label}>Enter 4-Digit OTP</Text>
                <TextInput 
                  style={[styles.otpInput, errors.otpInput && styles.errorBorder]} 
                  placeholder="0 0 0 0" 
                  value={otpInput} 
                  onChangeText={(text) => { setOtpInput(text); setErrors({...errors, otpInput: null}); }} 
                  keyboardType="number-pad" 
                  maxLength={4}
                  returnKeyType="done"
                  onSubmitEditing={handleVerifyOtp} // Submit OTP when done 
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
                    {otpSent ? "Verify & Login" : (usePasswordLogin ? "Login Now" : "Get OTP")}
                </Text>
            )}
          </TouchableOpacity>

          {/* FOOTER TOGGLES */}
          {!otpSent && (
            <View style={styles.footer}>
                <TouchableOpacity onPress={() => toggleMode('register')}>
                    <Text style={styles.toggleText}>
                        {isRegistering ? "Already have an account? Login" : "New User? Register Now"}
                    </Text>
                </TouchableOpacity>

                {!isRegistering && (
                    <TouchableOpacity onPress={() => toggleMode('password')} style={{marginTop: 15}}>
                        <Text style={styles.secondaryToggle}>
                            {usePasswordLogin ? "Login with OTP instead" : "Login with Password instead"}
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