import React, { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView
} from 'react-native';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';

const BACKEND_URL = 'https://hostel-mngmt.onrender.com';

export default function RegisterScreen({ navigation }) {
  // Core fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  
  // Categorization fields
  const [role, setRole] = useState('student'); // student, warden, staff
  const [hostelType, setHostelType] = useState('Boys'); // Boys, Girls
  const [staffCategory, setStaffCategory] = useState('Security'); 
  
  // Student-specific fields
  const [roomNo, setRoomNo] = useState('');
  const [rollNo, setRollNo] = useState('');
  const [course, setCourse] = useState('');          // NEW
  const [parentMobile, setParentMobile] = useState(''); // NEW

  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const staffOptions = ['Security', 'Cleaning', 'Electrician', 'Plumber', 'Carpenter'];

  const handleRegister = async () => {
    // Basic validation
    if (!name || !email || !password || !mobile) {
      setErrorMsg('Please fill in all core details.');
      return;
    }
    // Updated student validation
    if (role === 'student' && (!roomNo || !rollNo || !course || !parentMobile)) {
      setErrorMsg('Students must provide Room No, Roll No, Course, and Parent Mobile.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // 1. Create the user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const uid = userCredential.user.uid;

      // 2. Build the data payload based on role
      let userData = {
        uid, // Required for MongoDB linking
        name,
        email: email.trim(),
        mobile,
        role,
        createdAt: new Date().toISOString(),
      };

      if (role === 'student') {
        userData = { ...userData, hostelType, roomNo, rollNo, course, parentMobile };
      } else if (role === 'warden') {
        userData = { ...userData, hostelType };
      } else if (role === 'staff') {
        userData = { ...userData, staffCategory };
      }

      // 3. Save the profile data to Firestore (Kept temporarily for AuthContext compatibility)
      await setDoc(doc(db, 'users', uid), userData);

      // 4. SAVE TO MONGODB ATLAS
      const mongoRes = await fetch(`${BACKEND_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      });

      if (!mongoRes.ok) {
        const errorText = await mongoRes.text();
        throw new Error(`Failed to save to MongoDB: ${errorText}`);
      }

      // AuthContext will automatically detect the login and route the user!
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        setErrorMsg('That email address is already in use!');
      } else if (error.code === 'auth/weak-password') {
        setErrorMsg('Password should be at least 6 characters.');
      } else {
        setErrorMsg(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join the campus portal</Text>
        </View>

        {errorMsg ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        ) : null}

        {/* --- ROLE SELECTION --- */}
        <Text style={styles.sectionLabel}>I am a...</Text>
        <View style={styles.toggleContainer}>
          {['student', 'warden', 'staff'].map((r) => (
            <TouchableOpacity 
              key={r} 
              style={[styles.toggleButton, role === r && styles.toggleButtonActive]}
              onPress={() => setRole(r)}
            >
              <Text style={[styles.toggleText, role === r && styles.toggleTextActive]}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* --- CONDITIONAL FIELDS --- */}
        
        {/* Hostel Type (Only for Students and Wardens) */}
        {(role === 'student' || role === 'warden') && (
          <>
            <Text style={styles.sectionLabel}>Hostel Type</Text>
            <View style={styles.toggleContainer}>
              {['Boys', 'Girls'].map((type) => (
                <TouchableOpacity 
                  key={type} 
                  style={[styles.toggleButton, hostelType === type && styles.toggleButtonActive]}
                  onPress={() => setHostelType(type)}
                >
                  <Text style={[styles.toggleText, hostelType === type && styles.toggleTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Staff Category (Only for Staff) */}
        {role === 'staff' && (
          <>
            <Text style={styles.sectionLabel}>Department</Text>
            <View style={styles.gridContainer}>
              {staffOptions.map((cat) => (
                <TouchableOpacity 
                  key={cat} 
                  style={[styles.gridButton, staffCategory === cat && styles.toggleButtonActive]}
                  onPress={() => setStaffCategory(cat)}
                >
                  <Text style={[styles.gridText, staffCategory === cat && styles.toggleTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* --- CORE DETAILS --- */}
        <View style={styles.inputContainer}>
          <TextInput style={styles.input} placeholder="Full Name" placeholderTextColor="#999" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Email Address" placeholderTextColor="#999" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
          <TextInput style={styles.input} placeholder="Mobile Number" placeholderTextColor="#999" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
          <TextInput style={styles.input} placeholder="Password (Min 6 chars)" placeholderTextColor="#999" value={password} onChangeText={setPassword} secureTextEntry />
        </View>

        {/* --- STUDENT ONLY DETAILS --- */}
        {role === 'student' && (
          <>
            <View style={styles.rowContainer}>
              <TextInput style={[styles.input, styles.halfInput]} placeholder="Room No." placeholderTextColor="#999" value={roomNo} onChangeText={setRoomNo} />
              <TextInput style={[styles.input, styles.halfInput]} placeholder="Roll No." placeholderTextColor="#999" value={rollNo} onChangeText={setRollNo} />
            </View>
            <View style={styles.rowContainer}>
              <TextInput style={[styles.input, styles.halfInput]} placeholder="Course" placeholderTextColor="#999" value={course} onChangeText={setCourse} />
              <TextInput style={[styles.input, styles.halfInput]} placeholder="Parent Mobile" placeholderTextColor="#999" value={parentMobile} onChangeText={setParentMobile} keyboardType="phone-pad" />
            </View>
          </>
        )}

        <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={loading}>
          {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={styles.buttonText}>Register</Text>}
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20, paddingTop: 50, paddingBottom: 40 },
  headerContainer: { marginBottom: 20, alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: '#1a1a1a', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666' },
  errorContainer: { backgroundColor: '#ffe5e5', padding: 12, borderRadius: 8, marginBottom: 20, borderLeftWidth: 4, borderLeftColor: '#ff4c4c' },
  errorText: { color: '#d32f2f', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  sectionLabel: { fontSize: 14, fontWeight: '700', color: '#333', marginBottom: 10, marginTop: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  toggleContainer: { flexDirection: 'row', backgroundColor: '#e9ecef', borderRadius: 12, padding: 4, marginBottom: 20 },
  toggleButton: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8 },
  toggleButtonActive: { backgroundColor: '#007bff', shadowColor: '#007bff', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 2 },
  toggleText: { fontSize: 14, fontWeight: '600', color: '#6c757d' },
  toggleTextActive: { color: '#ffffff' },
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  gridButton: { backgroundColor: '#e9ecef', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 20 },
  gridText: { fontSize: 14, fontWeight: '500', color: '#6c757d' },
  inputContainer: { marginTop: 10 },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#e9ecef', padding: 16, borderRadius: 12, fontSize: 16, color: '#333', marginBottom: 12 },
  rowContainer: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInput: { width: '48%' },
  button: { backgroundColor: '#007bff', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 20, shadowColor: '#007bff', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4 },
  buttonText: { color: '#ffffff', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 25 },
  footerText: { color: '#666', fontSize: 15 },
  linkText: { color: '#007bff', fontSize: 15, fontWeight: 'bold' },
});