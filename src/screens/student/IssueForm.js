import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import uuid from 'react-native-uuid';
import { auth, db, storage } from '../../config/firebase';
import { AuthContext } from '../../context/AuthContext';

export default function IssueForm({ navigation }) {
  const { userData } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);
  const [staffCategory, setStaffCategory] = useState('Cleaning');
  const [description, setDescription] = useState('');
  const [images, setImages] = useState([]);

  const staffOptions = ['Cleaning', 'Electrician', 'Plumber', 'Carpenter'];

  const pickImages = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.5, 
    });

    if (!result.canceled) {
      const selectedUris = result.assets.map(asset => asset.uri);
      setImages(prevImages => [...prevImages, ...selectedUris]);
    }
  };

  const removeImage = (indexToRemove) => {
    setImages(prevImages => prevImages.filter((_, index) => index !== indexToRemove));
  };

  const uploadImageAsync = async (uri) => {
    const blob = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => resolve(xhr.response);
      xhr.onerror = (e) => reject(new TypeError('Network request failed'));
      xhr.responseType = 'blob';
      xhr.open('GET', uri, true);
      xhr.send(null);
    });

    const fileRef = ref(storage, `issues/${uuid.v4()}`);
    await uploadBytesResumable(fileRef, blob);
    blob.close();
    return await getDownloadURL(fileRef);
  };

  const submitIssue = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please describe the issue.');
      return;
    }

    setLoading(true);
    try {
      let uploadedImageUrls = [];
      
      if (images.length > 0) {
        const uploadPromises = images.map(uri => uploadImageAsync(uri));
        uploadedImageUrls = await Promise.all(uploadPromises);
      }

      await addDoc(collection(db, 'issues'), {
        studentId: auth.currentUser.uid,
        studentName: userData?.name || 'Student',
        hostelType: userData.hostelType, 
        roomNo: userData.roomNo,         
        staffCategory,                   
        description,
        imageUrl: uploadedImageUrls.length > 0 ? uploadedImageUrls[0] : null,
        imageUrls: uploadedImageUrls,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      Alert.alert('Success', 'Issue reported successfully.');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <Text style={styles.title}>Raise a Complaint</Text>

      <Text style={styles.label}>Select Category:</Text>
      <View style={styles.radioContainer}>
        {staffOptions.map(type => (
          <TouchableOpacity 
            key={type} 
            style={[styles.radioBtn, staffCategory === type && styles.radioBtnSelected]}
            onPress={() => setStaffCategory(type)}
          >
            <Text style={staffCategory === type ? styles.radioTextSelected : styles.radioText}>
              {type}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Description:</Text>
      <TextInput
        style={styles.textArea}
        placeholder="E.g., Ac not working, Cupboard broken..."
        multiline
        numberOfLines={4}
        value={description}
        onChangeText={setDescription}
      />

      {images.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.galleryContainer}>
          {images.map((uri, index) => (
            <View key={index} style={styles.imageWrapper}>
              <Image source={{ uri }} style={styles.thumbnailImage} />
              <TouchableOpacity style={styles.removeImageBtn} onPress={() => removeImage(index)}>
                <Text style={styles.removeImageText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity style={styles.imageBtn} onPress={pickImages}>
        <Text style={styles.imageBtnText}>
          {images.length > 0 ? 'Add More Images' : 'Attach Images (Optional)'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.submitBtn} onPress={submitIssue} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit Issue</Text>}
      </TouchableOpacity>
      
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 20, marginTop: 20 },
  label: { fontSize: 16, fontWeight: '600', marginBottom: 10, color: '#333' },
  radioContainer: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  radioBtn: { borderWidth: 1, borderColor: '#ccc', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, marginRight: 10, marginBottom: 10 },
  radioBtnSelected: { backgroundColor: '#007bff', borderColor: '#007bff' },
  radioText: { color: '#333' },
  radioTextSelected: { color: '#fff', fontWeight: 'bold' },
  textArea: { borderWidth: 1, borderColor: '#ddd', padding: 12, borderRadius: 8, backgroundColor: '#f9f9f9', textAlignVertical: 'top', marginBottom: 20 },
  galleryContainer: { marginBottom: 20, flexDirection: 'row' },
  imageWrapper: { position: 'relative', marginRight: 15, marginTop: 10 },
  thumbnailImage: { width: 100, height: 100, borderRadius: 12 },
  removeImageBtn: { 
    position: 'absolute', 
    top: -8, 
    right: -8, 
    backgroundColor: '#ff4c4c', 
    width: 26, 
    height: 26, 
    borderRadius: 13, 
    justifyContent: 'center', 
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  removeImageText: { color: '#fff', fontWeight: 'bold', fontSize: 14, lineHeight: 16 },
  imageBtn: { backgroundColor: '#6c757d', padding: 12, borderRadius: 8, alignItems: 'center', marginBottom: 20 },
  imageBtnText: { color: '#fff', fontWeight: '600' },
  submitBtn: { backgroundColor: '#28a745', padding: 15, borderRadius: 8, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});