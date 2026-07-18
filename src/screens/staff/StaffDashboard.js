import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { AuthContext } from '../../context/AuthContext';
import { auth } from '../../config/firebase';

export default function StaffDashboard({ navigation }) {
  const { userData, setUser } = useContext(AuthContext);

  const handleLogout = () => {
    auth.signOut();
    setUser(null);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Staff Portal</Text>
      <Text style={styles.subtitle}>Category: {userData?.staffCategory}</Text>

      <TouchableOpacity 
        style={styles.card} 
        onPress={() => navigation.navigate('StaffTasksList', { statusFilter: 'pending', title: 'Active Tasks' })}
      >
        <Text style={styles.cardTitle}>🚨 Active Tasks</Text>
        <Text style={styles.cardDesc}>New issues that need your attention</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.card} 
        onPress={() => navigation.navigate('StaffTasksList', { statusFilter: 'staff_completed', title: 'Waiting on Student' })}
      >
        <Text style={styles.cardTitle}>⏳ Waiting on Student</Text>
        <Text style={styles.cardDesc}>You marked these done. Waiting for student confirmation.</Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.card} 
        onPress={() => navigation.navigate('StaffTasksList', { statusFilter: 'resolved', title: 'Completed Tasks' })}
      >
        <Text style={styles.cardTitle}>✅ Completed Tasks</Text>
        <Text style={styles.cardDesc}>Fully resolved and confirmed issues</Text>
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
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 15, elevation: 2 },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#007bff', marginBottom: 5 },
  cardDesc: { color: '#666' },
  logoutBtn: { backgroundColor: '#dc3545', marginTop: 20 },
  logoutText: { color: '#fff', fontWeight: 'bold', textAlign: 'center', fontSize: 16 }
});