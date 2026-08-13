import React, { useEffect, useState, useContext, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Linking, ActivityIndicator } from 'react-native';
import { AuthContext } from '../../context/AuthContext';

const BACKEND_URL = 'https://hostel-mngmt.onrender.com';

export default function GatepassRequests({ navigation }) {
  const { userData } = useContext(AuthContext);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!userData || !userData.hostelType) return;

    try {
      const res = await fetch(`${BACKEND_URL}/api/gatepasses`);
      if (!res.ok) throw new Error('Failed to fetch gatepasses');
      const data = await res.json();

      // Filter: Match Warden's Hostel AND status must be 'pending' or 'emergency'
      const filtered = data.filter(gp => 
        gp.hostelType === userData.hostelType && 
        ['pending', 'emergency'].includes(gp.status)
      );

      // Sort: Emergencies at the very top, then oldest requests first
      filtered.sort((a, b) => {
        if (a.status === 'emergency' && b.status !== 'emergency') return -1;
        if (b.status === 'emergency' && a.status !== 'emergency') return 1;
        
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return timeA - timeB;
      });

      setRequests(filtered);
    } catch (error) {
      console.error("Error loading requests:", error);
    } finally {
      setLoading(false);
    }
  }, [userData]);

  useEffect(() => {
    fetchRequests();

    // Auto-refresh when navigating to this screen (if using a tab/stack navigator)
    let unsubscribeFocus;
    if (navigation) {
      unsubscribeFocus = navigation.addListener('focus', () => {
        fetchRequests();
      });
    }

    return () => {
      if (unsubscribeFocus) unsubscribeFocus();
    };
  }, [fetchRequests, navigation]);

  const updateStatus = async (id, newStatus) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/gatepasses/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      if (!res.ok) throw new Error('Failed to update status on server');
      
      // Refresh the list locally right after a successful update
      fetchRequests();
    } catch (error) {
      Alert.alert('Error', 'Failed to update gatepass status.');
    }
  };

  const callNumber = (phoneNumber, person) => {
    if (phoneNumber) {
      Linking.openURL(`tel:${phoneNumber}`);
    } else {
      Alert.alert('Error', `No ${person} contact number provided.`);
    }
  };

  const renderItem = ({ item }) => {
    const isEmergency = item.status === 'emergency';
    const isPreApproval = item.type === 'pre-approval';

    return (
      <View style={[styles.card, isEmergency && styles.emergencyCard]}>
        {isEmergency && <Text style={styles.emergencyBadge}>🚨 EMERGENCY REQUEST 🚨</Text>}
        {isPreApproval && <Text style={styles.preApprovalBadge}>📅 FOR TOMORROW</Text>}

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
        
        <View style={styles.timeBox}>
          <Text style={styles.timeText}><Text style={styles.bold}>Out:</Text> {item.expectedOut}</Text>
          <Text style={styles.timeText}><Text style={styles.bold}>In:</Text> {item.expectedIn}</Text>
        </View>
        
        <View style={styles.contactContainer}>
          <View style={styles.contactRow}>
            <Text style={styles.detailText}><Text style={styles.bold}>Student:</Text> {item.mobile}</Text>
            <TouchableOpacity style={styles.callBtn} onPress={() => callNumber(item.mobile, 'student')}>
              <Text style={styles.callBtnText}>📞 Call</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.contactRow}>
            <Text style={styles.detailText}><Text style={styles.bold}>Parent:</Text> {item.parentMobile}</Text>
            <TouchableOpacity style={styles.callBtn} onPress={() => callNumber(item.parentMobile, 'parent')}>
              <Text style={styles.callBtnText}>📞 Call</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.actionRow}>
          {isEmergency ? (
            <TouchableOpacity 
              style={[styles.btn, styles.acknowledgeBtn]} 
              onPress={() => updateStatus(item._id, 'approved')} // Updated to use MongoDB's _id
            >
              <Text style={styles.btnText}>Acknowledge Emergency</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity 
                style={[styles.btn, styles.declineBtn]} 
                onPress={() => updateStatus(item._id, 'declined')} // Updated to use MongoDB's _id
              >
                <Text style={styles.btnText}>Decline</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.btn, styles.approveBtn]} 
                onPress={() => updateStatus(item._id, 'approved')} // Updated to use MongoDB's _id
              >
                <Text style={styles.btnText}>Approve</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
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
      <Text style={styles.title}>Pending & Alerts ({requests.length})</Text>
      <FlatList
        data={requests}
        keyExtractor={item => item._id} // Updated to use MongoDB's _id
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.emptyText}>No pending gatepass requests.</Text>}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
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
  emergencyCard: { borderWidth: 2, borderColor: '#dc3545', backgroundColor: '#fff5f5' },
  emergencyBadge: { backgroundColor: '#dc3545', color: '#fff', textAlign: 'center', padding: 5, fontWeight: 'bold', borderRadius: 5, marginBottom: 10, overflow: 'hidden' },
  preApprovalBadge: { backgroundColor: '#17a2b8', color: '#fff', textAlign: 'center', padding: 5, fontWeight: 'bold', borderRadius: 5, marginBottom: 10, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  studentName: { fontSize: 18, fontWeight: 'bold', color: '#007bff' },
  roomNo: { fontSize: 16, fontWeight: '600', color: '#dc3545' },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  detailText: { fontSize: 14, color: '#444', marginBottom: 5 },
  bold: { fontWeight: 'bold', color: '#333' },
  timeBox: { backgroundColor: '#f8f9fa', padding: 8, borderRadius: 6, marginVertical: 8, borderWidth: 1, borderColor: '#eee' },
  timeText: { fontSize: 13, color: '#555', marginBottom: 2 },
  contactContainer: { marginTop: 10, padding: 10, backgroundColor: '#f8f9fa', borderRadius: 8 },
  contactRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  callBtn: { backgroundColor: '#6c757d', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 6 },
  callBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15 },
  btn: { flex: 0.48, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  declineBtn: { backgroundColor: '#ff4c4c' },
  approveBtn: { backgroundColor: '#28a745' },
  acknowledgeBtn: { backgroundColor: '#dc3545', flex: 1 },
  btnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});