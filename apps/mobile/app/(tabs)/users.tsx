import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/context/AuthContext';

export default function UsersRedirect() {
  const { user } = useAuth();

  // This route used to exist in courier tabs; now users management lives under dispatcher/admin tabs.
  if (user?.role === 'COURIER') return <Redirect href="/(tabs)" />;
  return <Redirect href="/(dispatcher-tabs)/users" />;
}
