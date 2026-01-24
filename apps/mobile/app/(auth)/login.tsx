import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import Constants from 'expo-constants';
import * as Application from 'expo-application';
import { useAuth } from '@/lib/context/AuthContext';
import { getStoredUser } from '@/lib/api/auth';
import logger from '@/lib/services/logger';

const APP_VERSION = Application.nativeApplicationVersion || Constants.expoConfig?.version || '1.0.0';

// Cross-platform alert that works on web
const showAlert = (title: string, message: string) => {
  if (Platform.OS === 'web') {
    window.alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
};

type LoginMode = 'pin' | 'credentials';

export default function LoginScreen() {
  const { login, loginPin } = useAuth();
  const [mode, setMode] = useState<LoginMode>('pin');
  const [pin, setPin] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePinLogin = async () => {
    if (pin.length < 4) {
      showAlert('Error', 'El PIN debe tener al menos 4 dígitos');
      return;
    }

    setIsLoading(true);
    try {
      logger.info('Attempting PIN login', { pinLength: pin.length });
      await loginPin(pin);
      logger.info('PIN login successful');
      const u = await getStoredUser();
      router.replace((u?.role === 'COURIER' ? '/(tabs)' : '/(dispatcher-tabs)') as any);
    } catch (error: unknown) {
      logger.error('PIN login failed', error, { pinLength: pin.length });
      let message = 'PIN incorrecto';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string } } };
        message = axiosError.response?.data?.error || message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      showAlert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCredentialsLogin = async () => {
    if (!username || !password) {
      showAlert('Error', 'Por favor ingresa usuario y contraseña');
      return;
    }

    setIsLoading(true);
    try {
      logger.info('Attempting credentials login', { username });
      await login(username, password);
      logger.info('Credentials login successful', { username });
      const u = await getStoredUser();
      router.replace((u?.role === 'COURIER' ? '/(tabs)' : '/(dispatcher-tabs)') as any);
    } catch (error: unknown) {
      logger.error('Credentials login failed', error, { username });
      let message = 'Credenciales incorrectas';
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string } } };
        message = axiosError.response?.data?.error || message;
      } else if (error instanceof Error) {
        message = error.message;
      }
      showAlert('Error', message);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePinKeyPress = (digit: string) => {
    if (pin.length < 6) {
      setPin(prev => prev + digit);
    }
  };

  const handlePinDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.logo}>CertiLog</Text>
        <Text style={styles.subtitle}>Sistema de Entregas</Text>
        <Text style={styles.version}>v{APP_VERSION}</Text>
      </View>

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, mode === 'pin' && styles.tabActive]}
          onPress={() => setMode('pin')}
        >
          <Text style={[styles.tabText, mode === 'pin' && styles.tabTextActive]}>
            PIN
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, mode === 'credentials' && styles.tabActive]}
          onPress={() => setMode('credentials')}
        >
          <Text style={[styles.tabText, mode === 'credentials' && styles.tabTextActive]}>
            Usuario
          </Text>
        </TouchableOpacity>
      </View>

      {mode === 'pin' ? (
        <View style={styles.pinContainer}>
          <View style={styles.pinDisplay}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View
                key={i}
                style={[styles.pinDot, pin.length > i && styles.pinDotFilled]}
              />
            ))}
          </View>

          <View style={styles.keypad}>
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'DEL'].map((key) => (
              <TouchableOpacity
                key={key}
                style={[styles.keypadButton, !key && styles.keypadButtonEmpty]}
                onPress={() => {
                  if (key === 'DEL') handlePinDelete();
                  else if (key) handlePinKeyPress(key);
                }}
                disabled={!key || isLoading}
              >
                <Text style={styles.keypadText}>{key}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handlePinLogin}
            disabled={isLoading || pin.length < 4}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Ingresar</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.formContainer}>
          <TextInput
            style={styles.input}
            placeholder="Usuario o email"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={styles.input}
            placeholder="Contraseña"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleCredentialsLogin}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Ingresar</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 80,
    marginBottom: 40,
  },
  logo: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#3B82F6',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
  version: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 4,
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 32,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#3B82F6',
    fontWeight: '600',
  },
  pinContainer: {
    alignItems: 'center',
  },
  pinDisplay: {
    flexDirection: 'row',
    marginBottom: 32,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 8,
  },
  pinDotFilled: {
    backgroundColor: '#3B82F6',
  },
  keypad: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 280,
    justifyContent: 'center',
    marginBottom: 24,
  },
  keypadButton: {
    width: 80,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 4,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  keypadButtonEmpty: {
    backgroundColor: 'transparent',
  },
  keypadText: {
    fontSize: 24,
    fontWeight: '500',
    color: '#1F2937',
  },
  formContainer: {
    width: '100%',
  },
  input: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    backgroundColor: '#93C5FD',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
