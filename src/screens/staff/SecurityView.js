import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function SecurityView({ userData }) {
  // NEW: Added a state to toggle between Active passes and History
  const [activeTab, setActiveTab] = useState('active'); 
  const [register, setRegister] = useState({ approved: [], out: [], history: [] });

  useEffect(() => {
    if (!userData) return;

    // UPDATED: Now also fetching 'in' status so we can populate the History tab
    const q = query(
      collection(db, 'gatepasses'),
      where('status', 'in', ['approved', 'out', 'in'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const today = new Date().toDateString();
      
      const approved = [];
      const out = [];
      const history = [];

      allData.forEach(item => {
        if (item.status === 'out') {
          out.push(item);
        } else if (item.status === 'approved') {
          const passDate = item.date?.toDate().toDateString();
          if (passDate === today) {
            approved.push(item);
          }
        } else if (item.status === 'in') {
          history.push(item);
        }
      });

      // Sort the history so the most recently returned students are at the top
      history.sort((a, b) => (b.inTime || 0) - (a.inTime || 0));

      setRegister({ approved, out, history });
    });

    return () => unsubscribe();
  }, [userData]);

  // NEW: Saves the exact timestamp when the student leaves
  const markOut = async (id) => {
    try {
      await updateDoc(doc(db, 'gatepasses', id), { 
        status: 'out',
        outTime: Date.now() 
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to mark out.');
    }
  };

  // NEW: Calculates the duration when they return and moves it to history
  const markIn = async (item) => {
    try {
      const inTime = Date.now();
      let durationStr = "Unknown";

      // Calculate total time spent outside
      if (item.outTime) {
        const diffMs = inTime - item.outTime;
        const diffMins = Math.floor(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        durationStr = `${hours}h ${mins}m`;
      }

      await updateDoc(doc(db, 'gatepasses', item.id), { 
        status: 'in', 
        inTime: inTime,
        duration: durationStr 
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to mark in.');
    }
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDateTime = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const renderActiveItem = ({ item }) => (
    <View style={[styles.card, item.status === 'out' && styles.cardOut]}>
      <View style={styles.row}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.room}>Room {item.roomNo}</Text>
      </View>
      <Text style={styles.detail}>Roll No: {item.rollNo}</Text>
      <Text style={styles.detail}>Going to: {item.destination}</Text>
      
      {item.status === 'out' && (
        <Text style={styles.timeTracker}>Left at: {formatTime(item.outTime)}</Text>
      )}
      
      {item.status === 'approved' ? (
        <TouchableOpacity style={[styles.btn, styles.outBtn]} onPress={() => markOut(item.id)}>
          <Text style={styles.btnText}>MARK OUT</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={[styles.btn, styles.inBtn]} onPress={() => markIn(item)}>
          <Text style={styles.btnText}>MARK IN (Returned)</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderHistoryItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.name}>{item.name}</Text>
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{item.duration}</Text>
        </View>
      </View>
      <Text style={styles.detail}>Room {item.roomNo} | {item.destination}</Text>
      <View style={styles.timeBox}>
        <Text style={styles.timeLabel}>OUT: <Text style={styles.timeValue}>{formatDateTime(item.outTime)}</Text></Text>
        <Text style={styles.timeLabel}>IN: <Text style={styles.timeValue}>{formatDateTime(item.inTime)}</Text></Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      
      {/* Top Navigation Tabs */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'active' && styles.activeTab]} 
          onPress={() => setActiveTab('active')}
        >
          <Text style={[styles.tabText, activeTab === 'active' && styles.activeTabText]}>Live Passes</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'history' && styles.activeTab]} 
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>History</Text>
        </TouchableOpacity>
      </View>

      {/* Render Active View OR History View based on selected tab */}
      {activeTab === 'active' ? (
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Currently Outside ({register.out.length})</Text>
          <FlatList
            data={register.out}
            keyExtractor={item => item.id}
            renderItem={renderActiveItem}
            ListEmptyComponent={<Text style={styles.emptyText}>No students currently out.</Text>}
            style={styles.list}
          />

          <Text style={styles.sectionTitle}>Ready to Leave ({register.approved.length})</Text>
          <FlatList
            data={register.approved}
            keyExtractor={item => item.id}
            renderItem={renderActiveItem}
            ListEmptyComponent={<Text style={styles.emptyText}>No approved passes for today.</Text>}
            style={styles.list}
          />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Completed Passes ({register.history.length})</Text>
          <FlatList
            data={register.history}
            keyExtractor={item => item.id}
            renderItem={renderHistoryItem}
            ListEmptyComponent={<Text style={styles.emptyText}>No history recorded yet.</Text>}
            style={styles.list}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9', padding: 10 },
  
  // Tab Styles
  tabContainer: { flexDirection: 'row', backgroundColor: '#e9ecef', borderRadius: 8, padding: 4, marginBottom: 15 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  activeTab: { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  tabText: { fontSize: 15, fontWeight: 'bold', color: '#6c757d' },
  activeTabText: { color: '#007bff' },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10, marginTop: 5 },
  list: { flex: 1 },
  emptyText: { fontStyle: 'italic', color: '#666', marginBottom: 15, textAlign: 'center' },
  
  // Card Styles
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#343a40' },
  cardOut: { borderLeftColor: '#fd7e14' }, 
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  room: { fontSize: 14, color: '#007bff', fontWeight: 'bold' },
  detail: { fontSize: 14, color: '#555', marginBottom: 4 },
  timeTracker: { fontSize: 14, fontWeight: 'bold', color: '#fd7e14', marginVertical: 5 },
  
  // History Specific Styles
  durationBadge: { backgroundColor: '#e9ecef', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20 },
  durationText: { fontSize: 12, fontWeight: 'bold', color: '#495057' },
  timeBox: { backgroundColor: '#f8f9fa', padding: 10, borderRadius: 8, marginTop: 10 },
  timeLabel: { fontSize: 13, color: '#666', marginBottom: 4 },
  timeValue: { color: '#333', fontWeight: 'bold' },

  // Buttons
  btn: { paddingVertical: 10, borderRadius: 5, alignItems: 'center', marginTop: 10 },
  outBtn: { backgroundColor: '#ff9800' },
  inBtn: { backgroundColor: '#28a745' },
  btnText: { color: '#fff', fontWeight: 'bold' }
});