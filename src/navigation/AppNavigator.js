import React, { useContext } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthContext } from '../context/AuthContext';

// 1. Auth Screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// 2. Student Screens
import StudentDashboard from '../screens/student/StudentDashboard';
import GatepassForm from '../screens/student/GatepassForm';
import IssueForm from '../screens/student/IssueForm';

// 3. Warden Screens
import WardenDashboard from '../screens/warden/WardenDashboard';
import GatepassRequests from '../screens/warden/GatepassRequests';
import AllIssues from '../screens/warden/AllIssues';
import GatepassHistory from '../screens/warden/GatepassHistory';
import CategoryIssues from '../screens/warden/CategoryIssues';

// 4. Staff Screens
import StaffDashboard from '../screens/staff/StaffDashboard';
import StaffTasksList from '../screens/staff/StaffTasksList';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  const { user, userData, loading } = useContext(AuthContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!user ? (
          <>
            {/* If user is NOT logged in, show Auth Screens */}
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        ) : (
          <>
            {/* If user IS logged in, check their role and show the right portal */}
            {userData?.role === 'student' && (
              <>
                <Stack.Screen name="StudentPortal" component={StudentDashboard} />
                <Stack.Screen name="GatepassForm" component={GatepassForm} />
                <Stack.Screen name="IssueForm" component={IssueForm} />
              </>
            )}
            
            {userData?.role === 'warden' && (
              <>
                <Stack.Screen name="WardenPortal" component={WardenDashboard} />
                <Stack.Screen name="GatepassRequests" component={GatepassRequests} />
                <Stack.Screen name="AllIssues" component={AllIssues} />
                <Stack.Screen name="GatepassHistory" component={GatepassHistory} />
                <Stack.Screen name="CategoryIssues" component={CategoryIssues} />
              </>
            )}
            
            {userData?.role === 'staff' && (
              <>
                <Stack.Screen name="StaffPortal" component={StaffDashboard} />
                <Stack.Screen name="StaffTasksList" component={StaffTasksList} />
              </>
            )}
            
            {/* Fallback just in case profile data takes a second to load */}
            {!userData?.role && (
               <Stack.Screen name="LoadingProfile">
                 {() => <View style={{ flex: 1, backgroundColor: 'white' }} />}
               </Stack.Screen>
            )}
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}