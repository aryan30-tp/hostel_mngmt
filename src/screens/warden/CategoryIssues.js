import React, { useEffect, useState, useContext } from 'react';
import { View, Text, StyleSheet, FlatList, Image } from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { AuthContext } from '../../context/AuthContext';

export default function CategoryIssues({ route }) {
  const { category } = route.params;
  const { userData } = useContext(AuthContext);
  const [issues, setIssues] = useState([]);

  useEffect(() => {
    if (!userData || !userData.hostelType) return;

    const q = query(
      collection(db, 'issues'),
      where('hostelType', '==', userData.hostelType),
      where('staffCategory', '==', category) // Filter by the folder clicked
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setIssues(data);
    });

    return () => unsubscribe();
  }, [userData, category]);

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.studentName}>{item.studentName} (Room {item.roomNo})</Text>
      <Text style={styles.status}>Status: {item.status.toUpperCase()}</Text>
      <Text style={styles.description}>{item.description}</Text>
      {item.imageUrl && <Image source={{ uri: item.imageUrl }} style={styles.image} />}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{category} Issues</Text>
      <FlatList
        data={issues}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListEmptyComponent={<Text style={styles.emptyText}>No {category} issues found.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 15, marginTop: 10 },
  emptyText: { fontStyle: 'italic', color: '#666', textAlign: 'center', marginTop: 20 },
  card: { backgroundColor: '#fff', padding: 16, borderRadius: 10, marginBottom: 15, elevation: 2 },
  studentName: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  status: { fontSize: 12, fontWeight: 'bold', color: '#007bff', marginVertical: 5 },
  description: { fontSize: 14, color: '#555', marginBottom: 10 },
  image: { width: '100%', height: 150, borderRadius: 8 }
});