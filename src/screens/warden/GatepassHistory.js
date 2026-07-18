import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { AuthContext } from '../../context/AuthContext';

export default function GatepassHistory() {
  const { userData } = useContext(AuthContext);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!userData || !userData.hostelType) return;

    const q = query(
      collection(db, 'gatepasses'),
      where('hostelType', '==', userData.hostelType),
      where('status', 'in', ['approved', 'declined']) // Only fetch processed passes
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => (b.date?.toMillis() || 0) - (a.date?.toMillis() || 0)); // Newest first
      setHistory(data);
    });

    return () => unsubscribe();
  }, [userData]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.studentName}>{item.name}</Text>
        <Text style={[styles.statusBadge, { color: item.status === 'approved' ? '#28a745' : '#dc3545' }]}>
          {item.status.toUpperCase()}
        </Text>
      </View>
      <Text style={styles.detailText}>Room: {item.roomNo} | Roll: {item.rollNo}</Text>
      <Text style={styles.detailText}>Destination: {item.destination}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gatepass History</Text>
      <FlatList
        data={history}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.emptyText}>No history found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, marginTop: 10 },
  emptyText: { fontStyle: 'italic', color: '#666', textAlign: 'center', marginTop: 20 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 10, marginBottom: 15, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  studentName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  statusBadge: { fontSize: 14, fontWeight: 'bold' },
  detailText: { fontSize: 14, color: '#555', marginTop: 4 }
});