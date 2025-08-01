import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { TextInput, PasswordInput, Button, Title, Text, Stack, Group, Divider, Box } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconFingerprint, IconMail, IconLock, IconUser } from '@tabler/icons-react';
import { useAuth } from '../hooks/useAuth';
import { registerWebAuthnCredential } from '../services/webauthn';

interface RegisterFormValues {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export default function Register() {
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const form = useForm<RegisterFormValues>({
    initialValues: {
      displayName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validate: {
      displayName: (value) => (value.length >= 2 ? null : 'Name should be at least 2 characters'),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : 'Invalid email'),
      password: (value) => (value.length >= 6 ? null : 'Password should be at least 6 characters'),
      confirmPassword: (value, values) =>
        value === values.password ? null : 'Passwords do not match',
    },
  });

  const handleSubmit = async (values: RegisterFormValues) => {
    setLoading(true);
    try {
      await signUp(values.email, values.password, values.displayName);
      toast.success('Registration successful! You can now log in.');
      navigate('/login');
    } catch (error) {
      console.error('Registration error:', error);
      toast.error('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricRegistration = async () => {
    // In a real app, this would be after the user has registered with email/password
    // and is logged in. For demo purposes, we'll use a fixed user ID.
    const userId = prompt('Enter your user ID (for demo purposes):');
    const username = prompt('Enter your username (for demo purposes):');
    
    if (!userId || !username) {
      return;
    }

    setLoading(true);
    try {
      const result = await registerWebAuthnCredential(userId, username);
      if (result.verified) {
        toast.success('Biometric registration successful');
      } else {
        toast.error('Biometric registration failed');
      }
    } catch (error) {
      console.error('Biometric registration error:', error);
      toast.error('Biometric registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maw={400} mx="auto" mt={50} p="md">
      <Title order={1} ta="center" mb="md">
        Create Account
      </Title>
      <Text c="dimmed" size="sm" ta="center" mb="xl">
        Register for a new banking account
      </Text>

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            required
            label="Full Name"
            placeholder="John Doe"
            leftSection={<IconUser size={16} />}
            {...form.getInputProps('displayName')}
          />

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

          <PasswordInput
            required
            label="Confirm Password"
            placeholder="Confirm your password"
            leftSection={<IconLock size={16} />}
            {...form.getInputProps('confirmPassword')}
          />

          <Button type="submit" loading={loading}>
            Register
          </Button>
        </Stack>
      </form>

      <Divider label="Add biometric authentication" labelPosition="center" my="lg" />

      <Group grow>
        <Button
          leftSection={<IconFingerprint size={16} />}
          variant="outline"
          onClick={handleBiometricRegistration}
          disabled={loading}
        >
          Register Biometrics
        </Button>
      </Group>

      <Text size="sm" ta="center" mt="md">
        Already have an account?{' '}
        <Text component="a" href="/login" c="blue">
          Sign in
        </Text>
      </Text>
    </Box>
  );
} 
