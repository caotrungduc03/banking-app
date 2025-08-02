import { Button, Center, Divider, Paper, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconFingerprint, IconLock, IconMail, IconUser } from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../hooks/useAuth";
import { registerWebAuthnCredential } from "../services/webauthn";

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
      displayName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
    validate: {
      displayName: (value) => (value.length >= 2 ? null : "Name should be at least 2 characters"),
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email"),
      password: (value) => (value.length >= 6 ? null : "Password should be at least 6 characters"),
      confirmPassword: (value, values) => (value === values.password ? null : "Passwords do not match"),
    },
  });

  const handleSubmit = async (values: RegisterFormValues) => {
    setLoading(true);
    try {
      await signUp(values.email, values.password, values.displayName);
      toast.success("Registration successful! You can now log in.");
      navigate("/login");
    } catch (error: any) {
      console.error("Registration error:", error);
      // Handle Firebase specific error codes
      if (error.code === "auth/email-already-in-use") {
        toast.error("Email is already in use. Please try a different email.");
      } else if (error.code === "auth/invalid-email") {
        toast.error("Invalid email format.");
      } else if (error.code === "auth/weak-password") {
        toast.error("Password is too weak. It should be at least 6 characters.");
      } else {
        toast.error("Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricRegistration = async () => {
    // In a real app, this would be after the user has registered with email/password
    // and is logged in. For demo purposes, we'll use a fixed user ID.
    const userId = prompt("Enter your user ID (for demo purposes):");
    const username = prompt("Enter your username (for demo purposes):");

    if (!userId || !username) {
      return;
    }

    setLoading(true);
    try {
      const result = await registerWebAuthnCredential(userId, username);
      if (result.verified) {
        toast.success("Biometric registration successful");
      } else {
        toast.error("Biometric registration failed");
      }
    } catch (error) {
      console.error("Biometric registration error:", error);
      toast.error("Biometric registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Center style={{ width: "100vw", height: "100vh", margin: 0, padding: 0, position: "absolute", top: 0, left: 0 }}>
      <Paper radius="md" p="xl" withBorder shadow="md" style={{ width: "100%", maxWidth: 450 }}>
        <Title order={1} ta="center" mb="md">
          Create Account
        </Title>
        <Text c="dimmed" size="sm" ta="center" mb="xl">
          Register for a new banking account
        </Text>

        <form onSubmit={form.onSubmit(handleSubmit)}>
          <Stack gap="md">
            <TextInput
              required
              label="Full Name"
              placeholder="John Doe"
              leftSection={<IconUser size={16} />}
              {...form.getInputProps("displayName")}
            />

            <TextInput
              required
              label="Email"
              placeholder="your@email.com"
              leftSection={<IconMail size={16} />}
              {...form.getInputProps("email")}
            />

            <PasswordInput
              required
              label="Password"
              placeholder="Your password"
              leftSection={<IconLock size={16} />}
              {...form.getInputProps("password")}
            />

            <PasswordInput
              required
              label="Confirm Password"
              placeholder="Confirm your password"
              leftSection={<IconLock size={16} />}
              {...form.getInputProps("confirmPassword")}
            />

            <Button fullWidth type="submit" loading={loading} size="md">
              Register
            </Button>
          </Stack>
        </form>

        <Divider label="Add biometric authentication" labelPosition="center" my="lg" />

        <Button
          fullWidth
          leftSection={<IconFingerprint size={16} />}
          variant="outline"
          onClick={handleBiometricRegistration}
          disabled={loading}
          size="md"
        >
          Register Biometrics
        </Button>

        <Text size="sm" ta="center" mt="xl">
          Already have an account?{" "}
          <Text component="a" href="/login" c="blue">
            Sign in
          </Text>
        </Text>
      </Paper>
    </Center>
  );
}
