import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { TextInput, PasswordInput, Button, Title, Text, Stack, Group, Divider, Box } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconFingerprint, IconMail, IconLock } from '@tabler/icons-react';
import { useAuth } from '../hooks/useAuth';
import { authenticateWithWebAuthn } from '../services/webauthn';
import { isNFCSupported } from '../services/nfc';

interface LoginFormValues {
  email: string;
  password: string;
}

export default function Login() {
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const form = useForm<LoginFormValues>({
    initialValues: {
      email: '',
      password: '',
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      password: (value) => (value.length >= 6 ? null : 'Password should be at least 6 characters'),
    },
  });

  const handleSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      await signIn(values.email, values.password);
      toast.success('Login successful');
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setLoading(true);
    try {
      // For demo purposes, we'll use a fixed user ID
      // In a real app, you'd first ask for an email/username to identify the user
      const userId = prompt('Enter your user ID:');
      if (!userId) {
        setLoading(false);
        return;
      }

      const result = await authenticateWithWebAuthn(userId);
      if (result.verified) {
        toast.success('Biometric authentication successful');
        navigate('/dashboard');
      } else {
        toast.error('Biometric authentication failed');
      }
    } catch (error) {
      console.error('Biometric login error:', error);
      toast.error('Biometric login failed. Please try again or use password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maw={400} mx="auto" mt={50} p="md">
      <Title order={1} ta="center" mb="md">
        Banking App
      </Title>
      <Text c="dimmed" size="sm" ta="center" mb="xl">
        Secure banking with biometric authentication and NFC payments
      </Text>

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            required
            label="Email"
            placeholder="your@email.com"
            leftSection={<IconMail size={16} />}
            {...form.getInputProps('email')}
          />

          <PasswordInput
            required
            label="Password"
            placeholder="Your password"
            leftSection={<IconLock size={16} />}
            {...form.getInputProps('password')}
          />

          <Button type="submit" loading={loading}>
            Sign in
          </Button>
        </Stack>
      </form>

      <Divider label="Or continue with" labelPosition="center" my="lg" />

      <Group grow>
        <Button
          leftSection={<IconFingerprint size={16} />}
          variant="outline"
          onClick={handleBiometricLogin}
          loading={loading}
        >
          Biometric Login
        </Button>
      </Group>

      <Text size="sm" ta="center" mt="md">
        Don't have an account?{' '}
        <Text component="a" href="/register" c="blue">
          Register
        </Text>
      </Text>

      {isNFCSupported() ? (
        <Text size="xs" c="green" ta="center" mt="xl">
          NFC is supported on your device
        </Text>
      ) : (
        <Text size="xs" c="red" ta="center" mt="xl">
          NFC is not supported on your device or browser
        </Text>
      )}
    </Box>
  );
} 
