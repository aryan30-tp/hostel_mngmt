import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput, ActivityIndicator } from 'react-native';
import { io } from 'socket.io-client';

const BACKEND_URL = 'https://hostel-mngmt.onrender.com';

export default function SecurityView({ userData }) {
  const [activeTab, setActiveTab] = useState('active'); 
  const [register, setRegister] = useState({ approved: [], out: [], history: [] });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchGatepasses = useCallback(async () => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/gatepasses`);
      if (!res.ok) throw new Error('Failed to fetch gatepasses');
      const allData = await res.json();
      
      const today = new Date().toDateString();
      
      const approved = [];
      const out = [];
      const history = [];

      allData.forEach(item => {
        if (item.status === 'out') {
          out.push(item);
        } else if (item.status === 'approved' || item.status === 'emergency') {
          const passDate = new Date(item.targetDate || item.createdAt).toDateString();
          if (passDate === today || item.status === 'emergency') {
            approved.push(item);
          }
        } else if (item.status === 'in') {
          history.push(item);
        }
      });

      history.sort((a, b) => (b.inTime || 0) - (a.inTime || 0));

      setRegister({ approved, out, history });
    } catch (error) {
      console.error("Error loading security gatepasses:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userData) return;
    
    // Initial fetch on screen load
    fetchGatepasses();

    // 1. Open WebSockets Connection
    const socket = io(BACKEND_URL);

    // 2. Listen for the backend signal
    socket.on('gatepassUpdate', () => {
      console.log('Real-time update received! Refreshing list...');
      fetchGatepasses();
    });

    // 3. Clean up the connection when the screen is closed to save battery
    return () => {
      socket.disconnect();
    };
  }, [userData, fetchGatepasses]);

  const markOut = async (id) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/gatepasses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'out',
          outTime: Date.now() 
        })
      });
      if (!res.ok) throw new Error('Failed to update server');
      // No need to call fetchGatepasses() here—the Socket will handle it instantly!
    } catch (error) {
      Alert.alert('Error', 'Failed to mark out.');
    }
  };

  const markIn = async (item) => {
    try {
      const inTime = Date.now();
      let durationStr = "Unknown";

      if (item.outTime) {
        const diffMs = inTime - item.outTime;
        const diffMins = Math.floor(diffMs / 60000);
        const hours = Math.floor(diffMins / 60);
        const mins = diffMins % 60;
        durationStr = `${hours}h ${mins}m`;
      }

      const res = await fetch(`${BACKEND_URL}/api/gatepasses/${item._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'in', 
          inTime: inTime,
          duration: durationStr 
        })
      });
      if (!res.ok) throw new Error('Failed to update server');
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

  const filterByRollNo = (list) => {
    if (!searchQuery) return list;
    return list.filter(item => item.rollNo?.toLowerCase().includes(searchQuery.toLowerCase()));
  };

  const renderActiveItem = ({ item }) => (
    <View style={[styles.card, item.status === 'out' && styles.cardOut]}>
      <View style={styles.row}>
        <Text style={styles.name}>{item.name}</Text>
        <Text style={styles.room}>Room {item.roomNo}</Text>
      </View>
      <Text style={styles.detail}>Roll No: {item.rollNo}</Text>
      <Text style={styles.detail}>Going to: {item.destination}</Text>
      <Text style={styles.expectedText}>Expected Out: {item.expectedOut} | In: {item.expectedIn}</Text>
      
      {item.status === 'out' && (
        <Text style={styles.timeTracker}>Left at: {formatTime(item.outTime)}</Text>
      )}
      
      {['approved', 'emergency'].includes(item.status) ? (
        <TouchableOpacity style={[styles.btn, styles.outBtn]} onPress={() => markOut(item._id)}>
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
      <Text style={styles.detail}>Roll No: {item.rollNo} | Room {item.roomNo}</Text>
      <View style={styles.timeBox}>
        <Text style={styles.timeLabel}>OUT: <Text style={styles.timeValue}>{formatDateTime(item.outTime)}</Text></Text>
        <Text style={styles.timeLabel}>IN: <Text style={styles.timeValue}>{formatDateTime(item.inTime)}</Text></Text>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        placeholder="Search by Roll Number..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        keyboardType="default"
      />

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

      {activeTab === 'active' ? (
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Currently Outside ({filterByRollNo(register.out).length})</Text>
          <FlatList
            data={filterByRollNo(register.out)}
            keyExtractor={item => item._id}
            renderItem={renderActiveItem}
            ListEmptyComponent={<Text style={styles.emptyText}>No students currently out.</Text>}
            style={styles.list}
            showsVerticalScrollIndicator={false}
          />

          <Text style={styles.sectionTitle}>Ready to Leave ({filterByRollNo(register.approved).length})</Text>
          <FlatList
            data={filterByRollNo(register.approved)}
            keyExtractor={item => item._id}
            renderItem={renderActiveItem}
            ListEmptyComponent={<Text style={styles.emptyText}>No approved passes matching search.</Text>}
            style={styles.list}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <Text style={styles.sectionTitle}>Completed Passes (Latest 20)</Text>
          <FlatList
            data={filterByRollNo(register.history).slice(0, 20)}
            keyExtractor={item => item._id}
            renderItem={renderHistoryItem}
            ListEmptyComponent={<Text style={styles.emptyText}>No history recorded yet.</Text>}
            style={styles.list}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9', padding: 10 },
  searchInput: { backgroundColor: '#fff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 15, fontSize: 16 },
  tabContainer: { flexDirection: 'row', backgroundColor: '#e9ecef', borderRadius: 8, padding: 4, marginBottom: 15 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 6 },
  activeTab: { backgroundColor: '#fff', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  tabText: { fontSize: 15, fontWeight: 'bold', color: '#6c757d' },
  activeTabText: { color: '#007bff' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10, marginTop: 5 },
  list: { flex: 1 },
  emptyText: { fontStyle: 'italic', color: '#666', marginBottom: 15, textAlign: 'center' },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 2, borderLeftWidth: 4, borderLeftColor: '#343a40' },
  cardOut: { borderLeftColor: '#fd7e14' }, 
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  name: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  room: { fontSize: 14, color: '#007bff', fontWeight: 'bold' },
  detail: { fontSize: 14, color: '#555', marginBottom: 4 },
  expectedText: { fontSize: 12, color: '#17a2b8', fontStyle: 'italic', marginBottom: 4 },
  timeTracker: { fontSize: 14, fontWeight: 'bold', color: '#fd7e14', marginVertical: 5 },
  durationBadge: { backgroundColor: '#e9ecef', paddingVertical: 4, paddingHorizontal: 10, borderRadius: 20 },
  durationText: { fontSize: 12, fontWeight: 'bold', color: '#495057' },
  timeBox: { backgroundColor: '#f8f9fa', padding: 10, borderRadius: 8, marginTop: 10 },
  timeLabel: { fontSize: 13, color: '#666', marginBottom: 4 },
  timeValue: { color: '#333', fontWeight: 'bold' },
  btn: { paddingVertical: 10, borderRadius: 5, alignItems: 'center', marginTop: 10 },
  outBtn: { backgroundColor: '#ff9800' },
  inBtn: { backgroundColor: '#28a745' },
  btnText: { color: '#fff', fontWeight: 'bold' }
});