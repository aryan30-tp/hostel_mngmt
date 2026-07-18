import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { AuthContext } from '../../context/AuthContext';

export default function GatepassRequests() {
  const { userData } = useContext(AuthContext);
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    if (!userData || !userData.hostelType) return;

    // Fetch only pending requests for this specific warden's hostel
    const q = query(
      collection(db, 'gatepasses'),
      where('hostelType', '==', userData.hostelType),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by oldest first so first-come, first-served
      data.sort((a, b) => (a.date?.toMillis() || 0) - (b.date?.toMillis() || 0));
      setRequests(data);
    });

    return () => unsubscribe();
  }, [userData]);

  const updateStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, 'gatepasses', id), { status: newStatus });
    } catch (error) {
      Alert.alert('Error', 'Failed to update gatepass status.');
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.studentName}>{item.name}</Text>
        <Text style={styles.roomNo}>Room: {item.roomNo}</Text>
      </View>
      
      <View style={styles.detailsRow}>
        <Text style={styles.detailText}><Text style={styles.bold}>Roll No:</Text> {item.rollNo}</Text>
        <Text style={styles.detailText}><Text style={styles.bold}>Course:</Text> {item.course}</Text>
      </View>

      <Text style={styles.detailText}><Text style={styles.bold}>Going to:</Text> {item.destination}</Text>
      <Text style={styles.detailText}><Text style={styles.bold}>Reason:</Text> {item.reason}</Text>
      <Text style={styles.detailText}><Text style={styles.bold}>Parent Contact:</Text> {item.parentMobile}</Text>

      <View style={styles.actionRow}>
        <TouchableOpacity 
          style={[styles.btn, styles.declineBtn]} 
          onPress={() => updateStatus(item.id, 'declined')}
        >
          <Text style={styles.btnText}>Decline</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.btn, styles.approveBtn]} 
          onPress={() => updateStatus(item.id, 'approved')}
        >
          <Text style={styles.btnText}>Approve</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pending Approvals ({requests.length})</Text>
      <FlatList
        data={requests}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.emptyText}>No pending gatepass requests.</Text>}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 15, marginTop: 10 },
  listContent: { paddingBottom: 20 },
  emptyText: { fontStyle: 'italic', color: '#666', textAlign: 'center', marginTop: 20 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 10, marginBottom: 15, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  studentName: { fontSize: 18, fontWeight: 'bold', color: '#007bff' },
  roomNo: { fontSize: 16, fontWeight: '600', color: '#dc3545' },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  detailText: { fontSize: 14, color: '#444', marginBottom: 5 },
  bold: { fontWeight: 'bold', color: '#333' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  btn: { flex: 0.48, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  declineBtn: { backgroundColor: '#ff4c4c' },
  approveBtn: { backgroundColor: '#28a745' },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});