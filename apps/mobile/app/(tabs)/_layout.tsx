import { Tabs, Redirect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/context/AuthContext';

export default function TabsLayout() {
  const { user, isLoading } = useAuth();

  // Avoid rendering courier tabs until auth finishes loading to prevent
  // briefly showing dispatcher screens when the user is unknown.
  if (isLoading) return null;

  if (user && user.role !== 'COURIER') {
    return <Redirect href="/(dispatcher-tabs)" />;
  }

  // Debug: log auth state to help diagnose incorrect tab rendering
  try {
    console.log('[Layout][tabs] user:', JSON.stringify(user), 'isLoading:', isLoading);
  } catch (e) {
    console.log('[Layout][tabs] user (non-serializable)', user, 'isLoading:', isLoading);
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
        tabBarStyle: {
          backgroundColor: '#fff',
          borderTopColor: '#E5E7EB',
          paddingBottom: 8,
          paddingTop: 8,
          height: 64,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '500',
        },
        headerStyle: {
          backgroundColor: '#3B82F6',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Entregas',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="users"
        options={{
          title: 'Usuarios',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" size={size} color={color} />
          ),
          // Hide the tab button entirely for couriers
          tabBarButton: user?.role === 'COURIER' ? (() => null) : undefined,
        }}
      >
        {() => <Redirect href="/(dispatcher-tabs)/users" />}
      </Tabs.Screen>
    </Tabs>
  );
}
