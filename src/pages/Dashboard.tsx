import {
  Button,
  Card,
  Collapse,
  Container,
  Divider,
  Group,
  Modal,
  NumberInput,
  Stack,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconBug, IconDeviceFloppy, IconNfc, IconWallet } from "@tabler/icons-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import FirebaseConnectionTest from "../components/FirebaseConnectionTest";
import { useAuth } from "../hooks/useAuth";
import { isNFCSupported, processNFCPayment, startNFCScanning, writeNFCData } from "../services/nfc";

interface PaymentFormValues {
  receiverId: string;
  amount: number;
  description: string;
}

export default function Dashboard() {
  const { currentUser, userData, refreshUserData, signOut } = useAuth();
  const [nfcModalOpen, setNfcModalOpen] = useState(false);
  const [nfcWriteModalOpen, setNfcWriteModalOpen] = useState(false);
  const [nfcScanStatus, setNfcScanStatus] = useState<"idle" | "scanning" | "processing" | "success" | "error">("idle");
  const [nfcWriteStatus, setNfcWriteStatus] = useState<"idle" | "writing" | "success" | "error">("idle");
  const [showDebug, setShowDebug] = useState(false);
  const navigate = useNavigate();

  // Helper function to determine if the form is in loading state
  const isFormLoading = () => nfcWriteStatus === "writing";

  useEffect(() => {
    if (!currentUser) {
      navigate("/login");
    } else {
      refreshUserData();
    }
  }, [currentUser, navigate, refreshUserData]);

  const paymentForm = useForm<PaymentFormValues>({
    initialValues: {
      receiverId: "",
      amount: 0,
      description: "",
    },
    validate: {
      receiverId: (value) => (value ? null : "Receiver ID is required"),
      amount: (value) => (value > 0 ? null : "Amount must be greater than 0"),
      description: (value) => (value ? null : "Description is required"),
    },
  });

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Logout failed");
    }
  };

  const startNFCPayment = async () => {
    if (!isNFCSupported()) {
      toast.error("NFC is not supported on your device or browser");
      return;
    }

    setNfcModalOpen(true);
    setNfcScanStatus("scanning");

    try {
      await startNFCScanning(
        (paymentData) => {
          setNfcScanStatus("processing");

          if (!currentUser) {
            setNfcScanStatus("error");
            toast.error("You must be logged in to make payments");
            return;
          }

          processNFCPayment(
            currentUser.uid,
            paymentData,
            (transactionId) => {
              setNfcScanStatus("success");
              refreshUserData();
              toast.success(`Payment successful! Transaction ID: ${transactionId}`);

              // Close modal after success
              setTimeout(() => {
                setNfcModalOpen(false);
                setNfcScanStatus("idle");
              }, 2000);
            },
            (processError) => {
              setNfcScanStatus("error");
              toast.error(`Payment failed: ${processError.message}`);
            }
          );
        },
        (scanError) => {
          setNfcScanStatus("error");
          toast.error(`NFC scan error: ${scanError.message}`);
        }
      );
    } catch {
      setNfcScanStatus("error");
      toast.error("Failed to start NFC scanning");
    }
  };

  const handleWriteNFCData = async (values: PaymentFormValues) => {
    if (!isNFCSupported()) {
      toast.error("NFC is not supported on your device or browser");
      return;
    }

    setNfcWriteStatus("writing");

    try {
      await writeNFCData(
        {
          receiverId: values.receiverId,
          amount: values.amount,
          description: values.description,
        },
        () => {
          setNfcWriteStatus("success");
          toast.success("NFC tag written successfully");

          // Close modal after success
          setTimeout(() => {
            setNfcWriteModalOpen(false);
            setNfcWriteStatus("idle");
          }, 2000);
        },
        (writeError) => {
          setNfcWriteStatus("error");
          toast.error(`NFC write error: ${writeError.message}`);
        }
      );
    } catch {
      setNfcWriteStatus("error");
      toast.error("Failed to write NFC data");
    }
  };

  return (
    <Container size="sm" py="xl">
      <Group justify="space-between" mb="xl">
        <Title order={1}>Banking Dashboard</Title>
        <Button onClick={handleLogout} variant="subtle">
          Log out
        </Button>
      </Group>

      {userData ? (
        <>
          <Card withBorder shadow="sm" radius="md" mb="lg">
            <Group justify="space-between" mb="xs">
              <Text fw={500} size="lg">
                Account Overview
              </Text>
              <IconWallet size={24} />
            </Group>
            <Text size="xl" fw={700} c="blue">
              ${userData.accountBalance.toFixed(2)}
            </Text>
            <Text size="sm" c="dimmed">
              Available Balance
            </Text>
            <Divider my="sm" />
            <Text size="sm">Account Holder: {userData.displayName || "User"}</Text>
            <Text size="sm">Email: {userData.email}</Text>
          </Card>

          <Group grow mb="lg">
            <Button leftSection={<IconNfc size={20} />} onClick={startNFCPayment} disabled={!isNFCSupported()}>
              Make NFC Payment
            </Button>
            <Button
              leftSection={<IconDeviceFloppy size={20} />}
              onClick={() => setNfcWriteModalOpen(true)}
              disabled={!isNFCSupported()}
              variant="outline"
            >
              Create NFC Payment
            </Button>
          </Group>

          {!isNFCSupported() && (
            <Text c="red" size="sm" ta="center">
              NFC is not supported on your device or browser
            </Text>
          )}

          {/* Debug section */}
          <Card withBorder shadow="sm" radius="md" mb="lg" mt="xl">
            <Group justify="space-between" mb="xs">
              <Text fw={500} size="lg">
                Debug Tools
              </Text>
              <Button variant="subtle" leftSection={<IconBug size={16} />} onClick={() => setShowDebug(!showDebug)}>
                {showDebug ? "Hide Debug" : "Show Debug"}
              </Button>
            </Group>

            <Collapse in={showDebug}>
              <FirebaseConnectionTest />
            </Collapse>
          </Card>

          {/* NFC Scanning Modal */}
          <Modal
            opened={nfcModalOpen}
            onClose={() => {
              if (nfcScanStatus !== "scanning" && nfcScanStatus !== "processing") {
                setNfcModalOpen(false);
                setNfcScanStatus("idle");
              }
            }}
            title="NFC Payment"
            centered
          >
            <Stack align="center" gap="md">
              <IconNfc size={48} color={nfcScanStatus === "success" ? "green" : "blue"} />

              {nfcScanStatus === "scanning" && (
                <>
                  <Text fw={500}>Waiting for NFC tag...</Text>
                  <Text size="sm">Please tap your device to an NFC tag to make a payment</Text>
                </>
              )}

              {nfcScanStatus === "processing" && (
                <>
                  <Text fw={500}>Processing payment...</Text>
                  <Text size="sm">Please keep your device near the NFC tag</Text>
                </>
              )}

              {nfcScanStatus === "success" && (
                <>
                  <Text fw={500} c="green">
                    Payment successful!
                  </Text>
                  <Text size="sm">Your payment has been processed</Text>
                </>
              )}

              {nfcScanStatus === "error" && (
                <>
                  <Text fw={500} c="red">
                    Payment failed
                  </Text>
                  <Text size="sm">There was an error processing your payment</Text>
                  <Button onClick={() => setNfcModalOpen(false)}>Close</Button>
                </>
              )}

              {(nfcScanStatus === "scanning" || nfcScanStatus === "processing") && (
                <Button onClick={() => setNfcModalOpen(false)} variant="subtle">
                  Cancel
                </Button>
              )}
            </Stack>
          </Modal>

          {/* NFC Write Modal */}
          <Modal
            opened={nfcWriteModalOpen}
            onClose={() => {
              if (nfcWriteStatus === "idle" || nfcWriteStatus === "error" || nfcWriteStatus === "success") {
                setNfcWriteModalOpen(false);
                setNfcWriteStatus("idle");
              }
            }}
            title="Create NFC Payment"
            centered
          >
            {nfcWriteStatus === "idle" || nfcWriteStatus === "error" ? (
              <form onSubmit={paymentForm.onSubmit(handleWriteNFCData)}>
                <Stack>
                  <TextInput
                    label="Receiver ID"
                    placeholder="Enter receiver's user ID"
                    required
                    {...paymentForm.getInputProps("receiverId")}
                  />

                  <NumberInput
                    label="Amount"
                    placeholder="Enter amount"
                    required
                    min={0.01}
                    step={0.01}
                    decimalScale={2}
                    {...paymentForm.getInputProps("amount")}
                  />

                  <TextInput
                    label="Description"
                    placeholder="Enter payment description"
                    required
                    {...paymentForm.getInputProps("description")}
                  />

                  <Button type="submit" loading={isFormLoading()} leftSection={<IconDeviceFloppy size={16} />}>
                    Write to NFC Tag
                  </Button>
                </Stack>
              </form>
            ) : (
              <Stack align="center" gap="md">
                <IconNfc size={48} color={nfcWriteStatus === "success" ? "green" : "blue"} />

                {nfcWriteStatus === "writing" && (
                  <>
                    <Text fw={500}>Writing to NFC tag...</Text>
                    <Text size="sm">Please tap your device to an NFC tag</Text>
                  </>
                )}

                {nfcWriteStatus === "success" && (
                  <>
                    <Text fw={500} c="green">
                      NFC tag written successfully!
                    </Text>
                    <Text size="sm">The payment information has been saved to the NFC tag</Text>
                  </>
                )}

                {nfcWriteStatus === "writing" && (
                  <Button onClick={() => setNfcWriteModalOpen(false)} variant="subtle">
                    Cancel
                  </Button>
                )}
              </Stack>
            )}
          </Modal>
        </>
      ) : (
        <Text>Loading account information...</Text>
      )}
    </Container>
  );
}
