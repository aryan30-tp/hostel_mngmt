import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { AuthContext } from '../../context/AuthContext';

export default function GatepassForm({ navigation }) {
  const { userData } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [passType, setPassType] = useState('normal'); 
  const [form, setForm] = useState({
    name: userData?.name || '',
    rollNo: userData?.rollNo || '',
    roomNo: userData?.roomNo || '', 
    mobile: userData?.mobile || '',
    course: userData?.course || '',         // AUTOMATICALLY FILLED
    destination: '',
    reason: '',
    parentMobile: userData?.parentMobile || '', // AUTOMATICALLY FILLED
    expectedOut: '', 
    expectedIn: ''   
  });

  const handleChange = (name, value) => setForm({ ...form, [name]: value });

  const submitGatepass = async () => {
    if (!form.name || !form.rollNo || !form.destination || !form.reason || !form.parentMobile || !form.expectedOut || !form.expectedIn) {
      Alert.alert('Error', 'Please fill all required fields, including expected dates/times.');
      return;
    }

    setLoading(true);
    try {
      const studentId = auth.currentUser.uid;

      // 1. Check if the student already has an ACTIVE gatepass
      const activeQuery = query(
        collection(db, 'gatepasses'), 
        where('studentId', '==', studentId),
        where('status', 'in', ['pending', 'approved', 'out', 'emergency'])
      );
      const activeDocs = await getDocs(activeQuery);
      if (!activeDocs.empty) {
        Alert.alert('Request Denied', 'You already have an active gatepass. You cannot request another until it is completed or deleted.');
        setLoading(false);
        return;
      }

      // 2. Check if the student has been declined TWICE today
      const declinedQuery = query(
        collection(db, 'gatepasses'),
        where('studentId', '==', studentId),
        where('status', '==', 'declined')
      );
      const declinedDocs = await getDocs(declinedQuery);
      
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const declinedToday = declinedDocs.docs.filter(d => {
        const docDate = d.data().date?.toDate();
        return docDate >= todayStart;
      });

      if (declinedToday.length >= 2) {
        Alert.alert('Request Denied', 'Your gatepass requests have been declined twice today. Please try again tomorrow.');
        setLoading(false);
        return;
      }

      // 3. Submit the Gatepass
      const targetDate = new Date();
      if (passType === 'pre-approval') {
        targetDate.setDate(targetDate.getDate() + 1); 
      }

      await addDoc(collection(db, 'gatepasses'), {
        ...form,
        studentId: studentId,
        hostelType: userData.hostelType,
        type: passType, 
        targetDate: targetDate.toISOString(), 
        status: passType === 'emergency' ? 'emergency' : 'pending', 
        date: serverTimestamp()
      });

      Alert.alert('Success', 'Gatepass requested successfully');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Apply for Gatepass</Text>

      <View style={styles.typeContainer}>
        {['normal', 'pre-approval', 'emergency'].map((type) => (
          <TouchableOpacity 
            key={type} 
            style={[
              styles.typeBtn, 
              passType === type && styles.typeBtnActive,
              type === 'emergency' && passType === type && styles.typeBtnEmergency
            ]} 
            onPress={() => setPassType(type)}
          >
            <Text style={[
              styles.typeBtnText, 
              passType === type && styles.typeBtnTextActive
            ]}>
              {type === 'pre-approval' ? 'Pre-Approval' : type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {passType === 'pre-approval' && (
        <Text style={styles.helperText}>* This gatepass will be valid for tomorrow only.</Text>
      )}
      {passType === 'emergency' && (
        <Text style={styles.helperTextEmergency}>* No warden approval needed. Wardens and parents will be notified immediately.</Text>
      )}

      {['name', 'rollNo', 'roomNo', 'mobile', 'course', 'destination', 'reason', 'parentMobile'].map((field) => (
        <TextInput
          key={field}
          style={styles.input}
          placeholder={`Enter ${field.replace(/([A-Z])/g, ' $1').trim()}`}
          value={form[field]}
          onChangeText={(val) => handleChange(field, val)}
          keyboardType={(field === 'mobile' || field === 'parentMobile') ? 'phone-pad' : 'default'}
        />
      ))}

      {/* New Date/Time Inputs */}
      <Text style={styles.label}>Expected Out Time (e.g., Today 5:00 PM)</Text>
      <TextInput
        style={styles.input}
        placeholder="When will you leave?"
        value={form.expectedOut}
        onChangeText={(val) => handleChange('expectedOut', val)}
      />

      <Text style={styles.label}>Expected Return Time (e.g., Today 8:00 PM)</Text>
      <TextInput
        style={styles.input}
        placeholder="When will you return?"
        value={form.expectedIn}
        onChangeText={(val) => handleChange('expectedIn', val)}
      />

      <TouchableOpacity 
        style={[styles.submitBtn, passType === 'emergency' && styles.submitBtnEmergency]} 
        onPress={submitGatepass} 
        disabled={loading}
      >
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>{passType === 'emergency' ? 'Submit Emergency Request' : 'Submit Request'}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, marginTop: 10 },
  typeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  typeBtn: { flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, alignItems: 'center', marginHorizontal: 2, backgroundColor: '#f9f9f9' },
  typeBtnActive: { backgroundColor: '#007bff', borderColor: '#007bff' },
  typeBtnEmergency: { backgroundColor: '#dc3545', borderColor: '#dc3545' },
  typeBtnText: { color: '#555', fontWeight: 'bold', fontSize: 12 },
  typeBtnTextActive: { color: '#fff' },
  helperText: { fontSize: 12, color: '#007bff', marginBottom: 15, fontStyle: 'italic' },
  helperTextEmergency: { fontSize: 12, color: '#dc3545', marginBottom: 15, fontStyle: 'italic', fontWeight: 'bold' },
  label: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, marginBottom: 15, backgroundColor: '#f9f9f9', textTransform: 'capitalize' },
  submitBtn: { backgroundColor: '#007bff', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 40 },
  submitBtnEmergency: { backgroundColor: '#dc3545' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});