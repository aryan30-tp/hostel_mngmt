import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { auth } from '../../config/firebase';

export default function WardenDashboard({ navigation }) {
  const { userData, setUser } = useContext(AuthContext);

  const handleLogout = () => {
    auth.signOut();
    setUser(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Warden Dashboard</Text>
      <Text style={styles.subtitle}>Hostel: {userData?.hostelType}</Text>

      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('GatepassRequests')}>
        <Text style={styles.cardTitle}>Pending Gatepasses</Text>
        <Text style={styles.cardDesc}>Approve or decline new requests</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('GatepassHistory')}>
        <Text style={styles.cardTitle}>Gatepass History</Text>
        <Text style={styles.cardDesc}>View approved and declined passes</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('AllIssues')}>
        <Text style={styles.cardTitle}>Monitor Complaints</Text>
        <Text style={styles.cardDesc}>View staff issues by category</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.card, styles.logoutBtn]} onPress={handleLogout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#f4f6f9', justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: '#333', textAlign: 'center' },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 30 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 15, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#007bff', marginBottom: 5 },
  cardDesc: { color: '#666' },
  logoutBtn: { backgroundColor: '#dc3545', marginTop: 20 },
  logoutText: { color: '#fff', fontWeight: 'bold', textAlign: 'center', fontSize: 16 }
});