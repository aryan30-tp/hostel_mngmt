import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Alert } from 'react-native';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { AuthContext } from '../../context/AuthContext';

export default function StaffTasksList({ route }) {
  const { statusFilter, title } = route.params;
  const { userData } = useContext(AuthContext);
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    if (!userData || !userData.staffCategory) return;

    const q = query(
      collection(db, 'issues'),
      where('staffCategory', '==', userData.staffCategory),
      where('status', '==', statusFilter) // Dynamically loads pending, staff_completed, or resolved
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      data.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setTasks(data);
    });

    return () => unsubscribe();
  }, [userData, statusFilter]);

  const markCompleted = async (id) => {
    try {
      // Moves it out of "Active" and into "Waiting on Student"
      await updateDoc(doc(db, 'issues', id), { status: 'staff_completed' });
    } catch (error) {
      Alert.alert('Error', 'Could not update task.');
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.studentName}>Room {item.roomNo}</Text>
      <Text style={styles.description}>{item.description}</Text>
      {item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.image} />}
      
      {/* ONLY show this button if we are in the "Active Tasks" tab */}
      {statusFilter === 'pending' && (
        <TouchableOpacity style={styles.completeBtn} onPress={() => markCompleted(item.id)}>
          <Text style={styles.completeBtnText}>Mark as Fixed</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <FlatList
        data={tasks}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.emptyText}>No tasks found in this section.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, marginTop: 10 },
  emptyText: { fontStyle: 'italic', color: '#666', textAlign: 'center', marginTop: 20 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 10, marginBottom: 15, elevation: 2 },
  studentName: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 5 },
  description: { fontSize: 14, color: '#555', marginBottom: 10 },
  image: { width: '100%', height: 150, borderRadius: 8, marginBottom: 10 },
  completeBtn: { backgroundColor: '#28a745', padding: 12, borderRadius: 8, alignItems: 'center' },
  completeBtnText: { color: '#fff', fontWeight: 'bold' }
});