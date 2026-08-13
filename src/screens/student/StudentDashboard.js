import React, { useContext, useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth, db } from '../../config/firebase';
import { AuthContext } from '../../context/AuthContext';

export default function StudentDashboard({ navigation }) {
  const { userData } = useContext(AuthContext);
  const [issues, setIssues] = useState([]);
  const [gatepasses, setGatepasses] = useState([]);
  const previousStatusesRef = useRef({});

  useEffect(() => {
    if (!userData || !auth.currentUser?.uid) return;

    const issuesQ = query(collection(db, 'issues'), where('studentId', '==', auth.currentUser.uid));
    const unsubscribeIssues = onSnapshot(issuesQ, (snapshot) => {
      const issuesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const visibleIssues = issuesData.filter(issue => issue.status !== 'resolved');
      setIssues(visibleIssues);

      visibleIssues.forEach((issue) => {
        const previousStatus = previousStatusesRef.current[issue.id];
        if (previousStatus && previousStatus !== issue.status && issue.status === 'staff_completed') {
          Alert.alert('Issue update', 'Your maintenance issue has been marked complete by the staff member. Please confirm it from the dashboard.');
        }
        previousStatusesRef.current[issue.id] = issue.status;
      });
    });

    const gatepassQ = query(collection(db, 'gatepasses'), where('studentId', '==', auth.currentUser.uid));
    const unsubscribeGatepass = onSnapshot(gatepassQ, (snapshot) => {
      const gpData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const visibleGatepasses = gpData.filter(gp => gp.status !== 'in' && gp.status !== 'expired');
      setGatepasses(visibleGatepasses);

      visibleGatepasses.forEach((gatepass) => {
        const previousStatus = previousStatusesRef.current[gatepass.id];
        if (previousStatus && previousStatus !== gatepass.status && ['approved', 'declined'].includes(gatepass.status)) {
          Alert.alert('Gatepass update', `Your gatepass request was ${gatepass.status}.`);
        }
        previousStatusesRef.current[gatepass.id] = gatepass.status;
      });
    });

    return () => {
      unsubscribeIssues();
      unsubscribeGatepass();
    };
  }, [userData]);

  const markIssueResolved = async (issueId) => {
    try {
      await updateDoc(doc(db, 'issues', issueId), { status: 'resolved', studentConfirmedAt: new Date() });
      Alert.alert('Success', 'Issue marked as completely resolved.');
    } catch (error) {
      Alert.alert('Error', error.message);
    }
  };

  const handleDeleteGatepass = (gatepassId) => {
    Alert.alert('Delete Gatepass', 'Are you sure you want to delete this gatepass request?', [
      { text: 'Cancel', style: 'cancel' },
      { 
        text: 'Delete', 
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'gatepasses', gatepassId));
            Alert.alert('Success', 'Gatepass deleted.');
          } catch (error) {
            Alert.alert('Error', 'Failed to delete gatepass.');
          }
        }
      }
    ]);
  };

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Hello, {userData?.name}</Text>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutBtn}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('GatepassForm')}>
          <Text style={styles.actionBtnText}>Request Gatepass</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.navigate('IssueForm')}>
          <Text style={styles.actionBtnText}>Raise Issue</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Active Gatepasses</Text>
      <FlatList
        data={gatepasses}
        keyExtractor={item => item.id}
        ListEmptyComponent={<Text style={styles.emptyText}>No active gatepasses.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeaderRow}>
              <Text style={styles.cardTitle}>To: {item.destination}</Text>
              {/* Delete button only shown if the student hasn't left yet */}
              {['pending', 'approved', 'emergency'].includes(item.status) && (
                <TouchableOpacity onPress={() => handleDeleteGatepass(item.id)}>
                  <Text style={styles.deleteText}>Delete 🗑️</Text>
                </TouchableOpacity>
              )}
            </View>
            <Text>Status: <Text style={{ fontWeight: 'bold' }}>{item.status.toUpperCase()}</Text></Text>
            <Text style={styles.expectedText}>Out: {item.expectedOut} | In: {item.expectedIn}</Text>
            {item.status === 'approved' && (
              <Text style={styles.helperText}>Show this to the guard when leaving.</Text>
            )}
          </View>
        )}
      />

      <Text style={styles.sectionTitle}>My Issues</Text>
      <FlatList
        data={issues}
        keyExtractor={item => item.id}
        ListEmptyComponent={<Text style={styles.emptyText}>No active issues.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.staffType} Issue</Text>
            <Text>{item.description}</Text>
            <Text style={styles.statusText}>Status: {item.status.replace('_', ' ').toUpperCase()}</Text>
            
            {item.status === 'staff_completed' && (
              <TouchableOpacity 
                style={styles.resolveBtn} 
                onPress={() => markIssueResolved(item.id)}
              >
                <Text style={styles.resolveBtnText}>Confirm Final Completion</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 40, marginBottom: 20 },
  headerText: { fontSize: 24, fontWeight: 'bold' },
  logoutBtn: { backgroundColor: '#ff4c4c', padding: 8, borderRadius: 5 },
  logoutText: { color: '#fff', fontWeight: 'bold' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  actionBtn: { flex: 0.48, backgroundColor: '#007bff', padding: 15, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginVertical: 10, color: '#333' },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 10, elevation: 2 },
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  cardTitle: { fontSize: 16, fontWeight: 'bold' },
  deleteText: { color: '#dc3545', fontWeight: 'bold', fontSize: 14 },
  emptyText: { fontStyle: 'italic', color: '#666', marginBottom: 10 },
  helperText: { color: 'green', marginTop: 5, fontSize: 12 },
  expectedText: { color: '#6c757d', fontSize: 12, marginTop: 5 },
  statusText: { marginTop: 5, color: '#e68a00', fontWeight: '600' },
  resolveBtn: { backgroundColor: '#28a745', padding: 10, borderRadius: 5, marginTop: 10, alignItems: 'center' },
  resolveBtnText: { color: '#fff', fontWeight: 'bold' }
});