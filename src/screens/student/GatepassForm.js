import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { auth } from '../../config/firebase';
import { AuthContext } from '../../context/AuthContext';

const BACKEND_URL = 'https://hostel-mngmt.onrender.com';

export default function GatepassForm({ navigation }) {
  const { userData } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [passType, setPassType] = useState('normal'); 
  
  const [form, setForm] = useState({
    name: userData?.name || '',
    rollNo: userData?.rollNo || '',
    roomNo: userData?.roomNo || '', 
    mobile: userData?.mobile || '',
    course: userData?.course || '',         
    destination: '',
    reason: '',
    parentMobile: userData?.parentMobile || '' 
  });

  const [dateState, setDateState] = useState({
    outTime: new Date(),
    inDate: new Date(),
    inTime: new Date()
  });
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState('date'); 
  const [activeField, setActiveField] = useState(null); 

  const computedOutDate = new Date();
  if (passType === 'pre-approval') {
    computedOutDate.setDate(computedOutDate.getDate() + 1);
  }

  const handleChange = (name, value) => setForm({ ...form, [name]: value });

  const openPicker = (field, mode) => {
    setActiveField(field);
    setPickerMode(mode);
    setShowPicker(true);
  };

  const handleDateConfirm = (event, selectedDate) => {
    setShowPicker(Platform.OS === 'ios'); 
    if (selectedDate) {
      setDateState(prev => ({ ...prev, [activeField]: selectedDate }));
    }
    if (event.type === 'set' || event.type === 'dismissed') {
      setShowPicker(false);
    }
  };

  const formatDate = (date) => date.toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' });
  const formatTime = (date) => date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const submitGatepass = async () => {
    if (!form.name || !form.rollNo || !form.destination || !form.reason || !form.parentMobile) {
      Alert.alert('Error', 'Please fill all required text fields.');
      return;
    }

    setLoading(true);
    try {
      const studentId = auth.currentUser.uid;

      // 1. Fetch student's existing passes from MONGODB
      const res = await fetch(`${BACKEND_URL}/api/gatepasses/student/${studentId}`);
      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(`Server said: ${res.status} - ${errorData}`);
      }
      
      const existingPasses = await res.json();

      // Check for ACTIVE gatepass (Emergency passes BYPASS this rule)
      if (passType !== 'emergency') {
        const hasActive = existingPasses.some(p => ['pending', 'approved', 'out', 'emergency'].includes(p.status));
        if (hasActive) {
          Alert.alert('Request Denied', 'You already have an active gatepass. You cannot request another normal pass right now.');
          setLoading(false);
          return;
        }
      }

      // Check for 2 DECLINES today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      
      const declinesToday = existingPasses.filter(p => {
        const passDate = new Date(p.createdAt);
        return p.status === 'declined' && passDate >= todayStart;
      });

      if (declinesToday.length >= 2) {
        Alert.alert('Request Denied', 'Your gatepass requests have been declined twice today. Please try again tomorrow.');
        setLoading(false);
        return;
      }

      // 2. Format exact strings for the database (Handle Emergency Defaults)
      let expectedOutStr;
      let expectedInStr;

      if (passType === 'emergency') {
        const exactCurrentTime = new Date(); 
        expectedOutStr = `${formatDate(exactCurrentTime)} - ${formatTime(exactCurrentTime)}`;
        expectedInStr = 'TBD (Emergency)'; 
      } else {
        expectedOutStr = `${formatDate(computedOutDate)} - ${formatTime(dateState.outTime)}`;
        expectedInStr = `${formatDate(dateState.inDate)} - ${formatTime(dateState.inTime)}`;
      }

      // 3. Submit to MONGODB
      const submitRes = await fetch(`${BACKEND_URL}/api/gatepasses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          studentId: studentId,
          hostelType: userData.hostelType,
          type: passType,
          targetDate: computedOutDate.toISOString(),
          status: passType === 'emergency' ? 'emergency' : 'pending',
          expectedOut: expectedOutStr,
          expectedIn: expectedInStr
        })
      });

      if (!submitRes.ok) {
        const errorData = await submitRes.text();
        throw new Error(`Failed to save: ${submitRes.status} - ${errorData}`);
      }

      Alert.alert('Success', 'Gatepass requested successfully');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
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
            <Text style={[styles.typeBtnText, passType === type && styles.typeBtnTextActive]}>
              {type === 'pre-approval' ? 'Pre-Approval' : type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      
      {passType === 'pre-approval' && (
        <Text style={styles.helperText}>* Valid for tomorrow only.</Text>
      )}
      {passType === 'emergency' && (
        <Text style={styles.helperTextEmergency}>* No warden approval needed. Alerts sent immediately.</Text>
      )}

      <View style={styles.dateTimeCard}>
        <Text style={styles.dateTimeHeader}>Departure Details</Text>
        
        <Text style={styles.label}>Out Date (Auto-filled)</Text>
        <View style={styles.disabledBox}>
          <Text style={styles.disabledText}>{formatDate(computedOutDate)}</Text>
        </View>

        <Text style={styles.label}>Expected Out Time</Text>
        {passType === 'emergency' ? (
          <View style={styles.disabledBox}>
            <Text style={styles.disabledText}>🕒 {formatTime(new Date())} (Auto-filled)</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker('outTime', 'time')}>
            <Text style={styles.pickerBtnText}>🕒 {formatTime(dateState.outTime)}</Text>
          </TouchableOpacity>
        )}
      </View>

      {passType !== 'emergency' && (
        <View style={styles.dateTimeCard}>
          <Text style={styles.dateTimeHeader}>Return Details</Text>

          <Text style={styles.label}>Expected Return Date</Text>
          <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker('inDate', 'date')}>
            <Text style={styles.pickerBtnText}>📅 {formatDate(dateState.inDate)}</Text>
          </TouchableOpacity>

          <Text style={styles.label}>Expected Return Time</Text>
          <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker('inTime', 'time')}>
            <Text style={styles.pickerBtnText}>🕒 {formatTime(dateState.inTime)}</Text>
          </TouchableOpacity>
        </View>
      )}

      {showPicker && (
        <DateTimePicker
          value={dateState[activeField]}
          mode={pickerMode}
          is24Hour={false}
          display="default"
          onChange={handleDateConfirm}
          minimumDate={computedOutDate} 
        />
      )}

      <Text style={styles.sectionDivider}>Additional Details</Text>
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
  container: { flex: 1, padding: 20, backgroundColor: '#f4f6f9' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, marginTop: 10, color: '#333' },
  typeContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  typeBtn: { flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, alignItems: 'center', marginHorizontal: 2, backgroundColor: '#fff' },
  typeBtnActive: { backgroundColor: '#007bff', borderColor: '#007bff' },
  typeBtnEmergency: { backgroundColor: '#dc3545', borderColor: '#dc3545' },
  typeBtnText: { color: '#555', fontWeight: 'bold', fontSize: 12 },
  typeBtnTextActive: { color: '#fff' },
  helperText: { fontSize: 12, color: '#007bff', marginBottom: 15, fontStyle: 'italic' },
  helperTextEmergency: { fontSize: 12, color: '#dc3545', marginBottom: 15, fontStyle: 'italic', fontWeight: 'bold' },
  
  dateTimeCard: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4 },
  dateTimeHeader: { fontSize: 16, fontWeight: 'bold', color: '#007bff', marginBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 5 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 5 },
  disabledBox: { backgroundColor: '#e9ecef', padding: 12, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#ddd' },
  disabledText: { color: '#6c757d', fontWeight: 'bold' },
  pickerBtn: { backgroundColor: '#f8f9fa', padding: 12, borderRadius: 8, marginBottom: 15, borderWidth: 1, borderColor: '#ddd', alignItems: 'center' },
  pickerBtnText: { color: '#333', fontSize: 15, fontWeight: 'bold' },
  
  sectionDivider: { fontSize: 18, fontWeight: 'bold', marginTop: 10, marginBottom: 15, color: '#333' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, marginBottom: 15 },
  submitBtn: { backgroundColor: '#007bff', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 40, marginTop: 10 },
  submitBtnEmergency: { backgroundColor: '#dc3545' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});