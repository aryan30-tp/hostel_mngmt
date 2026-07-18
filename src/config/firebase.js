import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: "AIzaSyD4dFjFZxc-R5ZPQWskZ4ZnjIX_SY7buHw",
  authDomain: "myhostel-c9052.firebaseapp.com",
  projectId: "myhostel-c9052",
  storageBucket: "myhostel-c9052.firebasestorage.app",
  messagingSenderId: "584672969744",
  appId: "1:584672969744:web:b491999d47444b3f9ab695",
  measurementId: "G-PGD8RD3W6K"
};

// 1. Force a fresh initialization to bypass any old Expo memory cache
const APP_NAME = "MyHostelApp_Connection";
const app = getApps().find(a => a.name === APP_NAME) 
  ? getApp(APP_NAME) 
  : initializeApp(firebaseConfig, APP_NAME);

// 2. Initialize Auth with AsyncStorage safely
const initializeFirebaseAuth = () => {
  try {
    return initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch (error) {
    return getAuth(app);
  }
};

// 3. Export the services for the rest of your app to use
export const auth = initializeFirebaseAuth();
export const db = getFirestore(app);
export const storage = getStorage(app);