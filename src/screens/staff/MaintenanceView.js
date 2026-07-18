import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';

export default function MaintenanceView({ userData }) {
  const [pendingIssues, setPendingIssues] = useState([]);
  const [completedIssues, setCompletedIssues] = useState([]);

  useEffect(() => {
    if (!userData || !userData.staffCategory) return; // UPDATED

    // UPDATED: Removed hostel filter. Staff filters issues by their specific category.
    const q = query(
      collection(db, 'issues'),
      where('staffCategory', '==', userData.staffCategory) 
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const issueData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      issueData.sort((a, b) => (a.createdAt?.toMillis() || 0) - (b.createdAt?.toMillis() || 0));

      setPendingIssues(issueData.filter(issue => issue.status === 'pending'));
      setCompletedIssues(issueData.filter(issue => issue.status === 'staff_completed' || issue.status === 'resolved'));
    });

    return () => unsubscribe();
  }, [userData]);

  const markComplete = async (id) => {
    try {
      await updateDoc(doc(db, 'issues', id), {
        status: 'staff_completed',
        staffCompletedAt: serverTimestamp(),
      });
      Alert.alert('Success', 'Issue marked as completed. The student will confirm it next.');
    } catch (error) {
      Alert.alert('Error', 'Failed to update issue status.');
    }
  };

  const renderIssueCard = (item, showActionButton = true) => (
    <View style={styles.card} key={item.id}>
      <View style={styles.header}>
        <Text style={styles.room}>Room: {item.roomNo || 'N/A'}</Text>
        <Text style={styles.date}>
          {item.createdAt ? item.createdAt.toDate().toLocaleDateString() : 'Just now'}
        </Text>
      </View>

      <Text style={styles.studentName}>Student: {item.studentName || 'Unknown'}</Text>
      <Text style={styles.description}>{item.description}</Text>

      {item.imageUrl && (
        <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
      )}

      {showActionButton && (
        <TouchableOpacity style={styles.completeBtn} onPress={() => markComplete(item.id)}>
          <Text style={styles.completeBtnText}>Mark as Complete</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pending Issues ({pendingIssues.length})</Text>
      <FlatList
        data={pendingIssues}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderIssueCard(item, true)}
        ListEmptyComponent={<Text style={styles.emptyText}>You have no pending issues right now.</Text>}
        contentContainerStyle={styles.listContent}
      />

      <Text style={styles.title}>Completed Issues ({completedIssues.length})</Text>
      <FlatList
        data={completedIssues}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderIssueCard(item, false)}
        ListEmptyComponent={<Text style={styles.emptyText}>No completed issues yet.</Text>}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10, marginTop: 6 },
  listContent: { paddingBottom: 20 },
  emptyText: { fontStyle: 'italic', color: '#666', textAlign: 'center', marginTop: 20 },
  card: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, elevation: 2 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  room: { fontSize: 16, fontWeight: 'bold', color: '#dc3545' },
  date: { fontSize: 12, color: '#888', marginTop: 4 },
  studentName: { fontSize: 13, color: '#007bff', marginBottom: 8, fontWeight: '600' },
  description: { fontSize: 15, color: '#333', marginBottom: 12, lineHeight: 22 },
  image: { width: '100%', height: 150, borderRadius: 8, marginBottom: 12 },
  completeBtn: { backgroundColor: '#007bff', paddingVertical: 12, borderRadius: 6, alignItems: 'center' },
  completeBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 }
});