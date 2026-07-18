import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

export default function AllIssues({ navigation }) {
  const folders = [
    { name: 'Cleaning', icon: '🧹', color: '#17a2b8' },
    { name: 'Plumber', icon: '🚰', color: '#007bff' },
    { name: 'Electrician', icon: '⚡', color: '#ffc107' },
    { name: 'Carpenter', icon: '🔨', color: '#fd7e14' },
  ];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Complaint Folders</Text>
      <View style={styles.grid}>
        {folders.map((folder, index) => (
          <TouchableOpacity 
            key={index} 
            style={[styles.folderCard, { borderTopColor: folder.color }]}
            onPress={() => navigation.navigate('CategoryIssues', { category: folder.name })}
          >
            <Text style={styles.icon}>{folder.icon}</Text>
            <Text style={styles.folderName}>{folder.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f4f6f9', padding: 20 },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, marginTop: 10, color: '#333' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  folderCard: { width: '48%', backgroundColor: '#fff', padding: 20, borderRadius: 12, marginBottom: 15, alignItems: 'center', borderTopWidth: 5, elevation: 3 },
  icon: { fontSize: 32, marginBottom: 10 },
  folderName: { fontSize: 16, fontWeight: '600', color: '#333' }
});