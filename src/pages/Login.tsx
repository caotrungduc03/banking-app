import { Box, Button, Center, Divider, Paper, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconFingerprint, IconLock, IconMail } from "@tabler/icons-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import FirebaseConnectionTest from "../components/FirebaseConnectionTest";
import { useAuth } from "../hooks/useAuth";
import { isNFCSupported } from "../services/nfc";
import { authenticateWithWebAuthn } from "../services/webauthn";

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
      email: "",
      password: "",
    },
    validate: {
      email: (value) => (/^\S+@\S+$/.test(value) ? null : "Invalid email"),
      password: (value) => (value.length >= 6 ? null : "Password should be at least 6 characters"),
    },
  });

  const handleSubmit = async (values: LoginFormValues) => {
    setLoading(true);
    try {
      await signIn(values.email, values.password);
      toast.success("Login successful");
      navigate("/dashboard");
    } catch (error: any) {
      console.error("Login error:", error);
      // Handle Firebase specific error codes
      if (error.code === "auth/user-not-found") {
        toast.error("No account found with this email.");
      } else if (error.code === "auth/wrong-password") {
        toast.error("Invalid password.");
      } else if (error.code === "auth/invalid-email") {
        toast.error("Invalid email format.");
      } else if (error.code === "auth/too-many-requests") {
        toast.error("Too many failed login attempts. Please try again later.");
      } else {
        toast.error("Login failed. Please check your credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    setLoading(true);
    try {
      // For demo purposes, we'll use a fixed user ID
      // In a real app, you'd first ask for an email/username to identify the user
      const userId = prompt("Enter your user ID:");
      if (!userId) {
        setLoading(false);
        return;
      }

      const result = await authenticateWithWebAuthn(userId);
      if (result.verified) {
        toast.success("Biometric authentication successful");
        navigate("/dashboard");
      } else {
        toast.error("Biometric authentication failed");
      }
    } catch (error) {
      console.error("Biometric login error:", error);
      toast.error("Biometric login failed. Please try again or use password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Center style={{ width: "100vw", height: "100vh", margin: 0, padding: 0, position: "absolute", top: 0, left: 0 }}>
      <Box>
        <Paper radius="md" p="xl" withBorder shadow="md" style={{ width: "100%", maxWidth: 450, marginBottom: "20px" }}>
          <Title order={1} ta="center" mb="md">
            Banking App
          </Title>
          <Text c="dimmed" size="sm" ta="center" mb="xl">
            Secure banking with biometric authentication and NFC payments
          </Text>

          <form onSubmit={form.onSubmit(handleSubmit)}>
            <Stack gap="md">
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

              <Button fullWidth type="submit" loading={loading} size="md">
                Sign in
              </Button>
            </Stack>
          </form>

          <Divider label="Or continue with" labelPosition="center" my="lg" />

          <Button
            fullWidth
            leftSection={<IconFingerprint size={16} />}
            variant="outline"
            onClick={handleBiometricLogin}
            loading={loading}
            size="md"
          >
            Biometric Login
          </Button>

          <Text size="sm" ta="center" mt="xl">
            Don't have an account?{" "}
            <Text component="a" href="/register" c="blue">
              Register
            </Text>
          </Text>

          {isNFCSupported() ? (
            <Text size="xs" c="green" ta="center" mt="lg">
              NFC is supported on your device
            </Text>
          ) : (
            <Text size="xs" c="red" ta="center" mt="lg">
              NFC is not supported on your device or browser
            </Text>
          )}
        </Paper>
        <FirebaseConnectionTest />
      </Box>
    </Center>
  );
}
