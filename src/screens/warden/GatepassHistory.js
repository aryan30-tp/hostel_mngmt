import React, { useEffect, useState, useContext, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { AuthContext } from '../../context/AuthContext';

const BACKEND_URL = 'https://hostel-mngmt.onrender.com';

export default function GatepassHistory({ navigation }) {
  const { userData } = useContext(AuthContext);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    if (!userData || !userData.hostelType) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/gatepasses`);
      if (!res.ok) throw new Error('Failed to fetch gatepasses');
      const data = await res.json();

      // Filter: Match Warden's Hostel AND status must be a "processed" state
      const processedStatuses = ['approved', 'declined', 'out', 'in', 'expired'];
      
      const filtered = data.filter(gp => 
        gp.hostelType === userData.hostelType && 
        processedStatuses.includes(gp.status)
      );

      // Sort: Newest first using MongoDB's createdAt timestamp
      filtered.sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeB - timeA;
      });

      setHistory(filtered);
    } catch (error) {
      console.error("Error loading history:", error);
    } finally {
      setLoading(false);
    }
  }, [userData]);

  useEffect(() => {
    fetchHistory();

    // Auto-refresh when navigating back to this tab/screen
    let unsubscribeFocus;
    if (navigation) {
      unsubscribeFocus = navigation.addListener('focus', () => {
        fetchHistory();
      });
    }

    return () => {
      if (unsubscribeFocus) unsubscribeFocus();
    };
  }, [fetchHistory, navigation]);

  const renderItem = ({ item }) => {
    // Make approved, out, and in statuses green. Declined and expired red.
    const isPositiveStatus = ['approved', 'out', 'in'].includes(item.status);

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.studentName}>{item.name}</Text>
          <Text style={[
            styles.statusBadge, 
            { color: isPositiveStatus ? '#28a745' : '#dc3545' }
          ]}>
            {item.status.toUpperCase()}
          </Text>
        </View>
        <Text style={styles.detailText}>Room: {item.roomNo} | Roll: {item.rollNo}</Text>
        <Text style={styles.detailText}>Destination: {item.destination}</Text>
        <Text style={styles.dateText}>
          Applied: {item.createdAt ? new Date(item.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Gatepass History</Text>
      <FlatList
        data={history}
        keyExtractor={item => item._id} // Updated to use MongoDB's _id
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.emptyText}>No history found.</Text>}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, marginTop: 10, color: '#333' },
  emptyText: { fontStyle: 'italic', color: '#666', textAlign: 'center', marginTop: 20 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 10, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8, alignItems: 'center' },
  studentName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  statusBadge: { fontSize: 13, fontWeight: 'bold' },
  detailText: { fontSize: 14, color: '#555', marginTop: 4 },
  dateText: { fontSize: 12, color: '#888', marginTop: 10, fontStyle: 'italic' }
});