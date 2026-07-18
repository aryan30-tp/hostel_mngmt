import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { AuthContext } from '../../context/AuthContext';

export default function GatepassForm({ navigation }) {
  const { userData } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: userData?.name || '',
    rollNo: '',
    roomNo: userData?.roomNo || '', // UPDATED
    mobile: '',
    course: '',
    destination: '',
    reason: '',
    parentMobile: ''
  });

  const handleChange = (name, value) => setForm({ ...form, [name]: value });

  const submitGatepass = async () => {
    if (!form.name || !form.rollNo || !form.destination || !form.reason || !form.parentMobile) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'gatepasses'), {
        ...form,
        studentId: auth.currentUser.uid,
        hostelType: userData.hostelType, // UPDATED
        status: 'pending',
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

      <TouchableOpacity style={styles.submitBtn} onPress={submitGatepass} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Request</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, marginTop: 20 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, marginBottom: 15, backgroundColor: '#f9f9f9', textTransform: 'capitalize' },
  submitBtn: { backgroundColor: '#007bff', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 40 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});