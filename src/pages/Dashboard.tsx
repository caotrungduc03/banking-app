import {
  Button,
  Card,
  Container,
  Divider,
  Grid,
  Group,
  Loader,
  Modal,
  NumberInput,
  Paper,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
} from "@mantine/core";
import { DatePickerInput } from "@mantine/dates";
import { useForm } from "@mantine/form";
import {
  IconArrowDown,
  IconArrowUp,
  IconCalendar,
  IconCash,
  IconCreditCard,
  IconDeviceFloppy,
  IconHistory,
  IconNfc,
  IconQrcode,
  IconReportMoney,
  IconWallet,
} from "@tabler/icons-react";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import QRCodeTransaction from "../components/QRCodeTransaction";
import TransactionHistory from "../components/TransactionHistory";
import { useAuth } from "../hooks/useAuth";
import { isNFCSupported, processNFCPayment, startNFCScanning, writeNFCData } from "../services/nfc";
import { getTransactionStatistics } from "../services/statistics";

interface PaymentFormValues {
  receiverId: string;
  amount: number;
  description: string;
}

function SecurityStatus() {
  const { currentUser } = useAuth();
  const [securityScore, setSecurityScore] = useState(70); // Default score

  // Calculate security score based on user's security settings
  useEffect(() => {
    if (!currentUser) return;

    let score = 50; // Base score

    // Email verification adds 20 points
    if (currentUser.emailVerified) {
      score += 20;
    }

    // Having a display name adds 10 points
    if (currentUser.displayName) {
      score += 10;
    }

    // The phone number check is hypothetical since we don't have this data
    // This demonstrates how you could extend security features
    const hasPhoneNumber = false; // This would come from user data
    if (hasPhoneNumber) {
      score += 20;
    }

    setSecurityScore(score);
  }, [currentUser]);

  const getScoreColor = (score: number) => {
    if (score < 60) return "red";
    if (score < 80) return "yellow";
    return "green";
  };

  return (
    <Card withBorder shadow="sm" radius="md" mb="lg">
      <Group justify="space-between" mb="md">
        <Group>
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: getScoreColor(securityScore),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            S
          </div>
          <Title order={4}>Security Status</Title>
        </Group>
        <Text fw={700} size="xl" c={getScoreColor(securityScore)}>
          {securityScore}%
        </Text>
      </Group>

      <div
        style={{
          width: "100%",
          height: "8px",
          backgroundColor: "#e9ecef",
          borderRadius: "4px",
          marginBottom: "16px",
        }}
      >
        <div
          style={{
            width: `${securityScore}%`,
            height: "100%",
            backgroundColor: getScoreColor(securityScore),
            borderRadius: "4px",
          }}
        />
      </div>

      <Stack gap="xs">
        <Group justify="space-between">
          <Text size="sm">Email verification</Text>
          <Text size="sm" fw={500} c={currentUser?.emailVerified ? "green" : "red"}>
            {currentUser?.emailVerified ? "Verified" : "Not Verified"}
          </Text>
        </Group>

        <Group justify="space-between">
          <Text size="sm">Two-factor authentication</Text>
          <Text size="sm" fw={500} c="red">
            Not Enabled
          </Text>
        </Group>

        <Group justify="space-between">
          <Text size="sm">Last login</Text>
          <Text size="sm" fw={500}>
            {new Date().toLocaleDateString()}
          </Text>
        </Group>
      </Stack>

      <Button variant="light" color="blue" fullWidth mt="md">
        Security Settings
      </Button>
    </Card>
  );
}

function BankingStatistics() {
  const { currentUser } = useAuth();
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    dayjs().subtract(7, "day").toDate(),
    new Date(),
  ]);
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    totalTransactions: 0,
    categories: {} as Record<string, number>,
  });
  const [loading, setLoading] = useState(false);

  // Fetch statistics when date range changes
  useEffect(() => {
    async function fetchStatistics() {
      if (!currentUser || !dateRange[0] || !dateRange[1]) return;

      setLoading(true);
      try {
        const result = await getTransactionStatistics(currentUser.uid, {
          startDate: dateRange[0],
          endDate: dateRange[1],
        });

        setStats(result);
      } catch (error) {
        console.error("Error fetching statistics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStatistics();
  }, [currentUser, dateRange]);

  // Calculate category percentages
  const getCategories = () => {
    const entries = Object.entries(stats.categories);
    if (entries.length === 0) return [];

    const total = entries.reduce((sum, [_, value]) => sum + value, 0);
    return entries.map(([key, value]) => ({
      name: key,
      value,
      percentage: Math.round((value / total) * 100),
    }));
  };

  const categories = getCategories();

  // Color mapping for transaction types
  const getCategoryColor = (type: string) => {
    const colors: Record<string, string> = {
      transfer: "#228be6",
      nfc: "#fd7e14",
      deposit: "#40c057",
      withdrawal: "#fa5252",
    };

    return colors[type] || "#adb5bd";
  };

  return (
    <Card withBorder shadow="sm" radius="md" mb="lg">
      <Group justify="space-between" mb="lg">
        <Title order={4}>Banking Statistics</Title>
        <DatePickerInput
          type="range"
          value={dateRange as any}
          onChange={(value) => setDateRange(value as [Date | null, Date | null])}
          size="xs"
          leftSection={<IconCalendar size={16} />}
          clearable={false}
        />
      </Group>

      {loading ? (
        <Stack align="center" py="xl">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">
            Loading statistics...
          </Text>
        </Stack>
      ) : (
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
          {/* Income/Expense Summary */}
          <Card withBorder p="md" radius="md">
            <Text fw={500} mb="xs">
              Income vs Expenses
            </Text>
            <div
              style={{
                height: 200,
                background: "#f1f3f5",
                borderRadius: 8,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 16,
              }}
            >
              <Group mb="md">
                <Stack align="center" gap={5}>
                  <Text fw={700} size="xl" c="teal">
                    +${stats.totalIncome.toFixed(2)}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Income
                  </Text>
                </Stack>
                <Divider orientation="vertical" />
                <Stack align="center" gap={5}>
                  <Text fw={700} size="xl" c="red">
                    -${stats.totalExpenses.toFixed(2)}
                  </Text>
                  <Text size="xs" c="dimmed">
                    Expenses
                  </Text>
                </Stack>
              </Group>

              <Text size="sm" ta="center" mt="md">
                {stats.totalIncome > stats.totalExpenses ? (
                  <Text span c="teal">
                    You saved ${(stats.totalIncome - stats.totalExpenses).toFixed(2)}
                  </Text>
                ) : (
                  <Text span c="red">
                    You spent ${(stats.totalExpenses - stats.totalIncome).toFixed(2)} more than you earned
                  </Text>
                )}
              </Text>
            </div>
            <Group mt="md" justify="space-between">
              <Group>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "teal" }}></div>
                <Text size="xs">Income</Text>
              </Group>
              <Group>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "red" }}></div>
                <Text size="xs">Expenses</Text>
              </Group>
            </Group>
          </Card>

          {/* Transaction Categories */}
          <Card withBorder p="md" radius="md">
            <Text fw={500} mb="xs">
              Transaction Categories
            </Text>
            <div
              style={{
                height: 200,
                background: "#f1f3f5",
                borderRadius: 8,
                padding: 16,
                overflowY: "auto",
              }}
            >
              {categories.length > 0 ? (
                <Stack gap="xs">
                  {categories.map((category) => (
                    <div key={category.name}>
                      <Group justify="space-between" mb={5}>
                        <Group>
                          <div
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: "50%",
                              background: getCategoryColor(category.name),
                            }}
                          ></div>
                          <Text size="sm" style={{ textTransform: "capitalize" }}>
                            {category.name}
                          </Text>
                        </Group>
                        <Text size="sm" fw={500}>
                          ${category.value.toFixed(2)}
                        </Text>
                      </Group>
                      <div
                        style={{
                          height: 6,
                          width: "100%",
                          background: "#e9ecef",
                          borderRadius: 3,
                          marginBottom: 10,
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${category.percentage}%`,
                            background: getCategoryColor(category.name),
                            borderRadius: 3,
                          }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </Stack>
              ) : (
                <Text c="dimmed" ta="center" size="sm" py="xl">
                  No transaction data available
                </Text>
              )}
            </div>
            <Text size="xs" mt="md" c="dimmed">
              Based on {stats.totalTransactions} transactions
            </Text>
          </Card>
        </SimpleGrid>
      )}
    </Card>
  );
}

export default function Dashboard() {
  const { currentUser, userData, refreshUserData, signOut } = useAuth();
  const [nfcModalOpen, setNfcModalOpen] = useState(false);
  const [nfcWriteModalOpen, setNfcWriteModalOpen] = useState(false);
  const [nfcScanStatus, setNfcScanStatus] = useState<"idle" | "scanning" | "processing" | "success" | "error">("idle");
  const [nfcWriteStatus, setNfcWriteStatus] = useState<"idle" | "writing" | "success" | "error">("idle");
  const [showDebug, setShowDebug] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>("overview");
  const [recentStats, setRecentStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    totalTransactions: 0,
  });
  const [monthlyStats, setMonthlyStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    totalTransactions: 0,
  });
  const [loading, setLoading] = useState(true);
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

  // Load statistics for the dashboard
  useEffect(() => {
    async function fetchDashboardStats() {
      if (!currentUser || loading) return;

      setLoading(true);
      try {
        // Get stats for last 7 days
        const endDate = new Date();
        const startDateWeek = new Date();
        startDateWeek.setDate(startDateWeek.getDate() - 7);

        const weeklyStats = await getTransactionStatistics(currentUser.uid, {
          startDate: startDateWeek,
          endDate,
        });

        // Get stats for current month
        const startDateMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        const monthlyStats = await getTransactionStatistics(currentUser.uid, {
          startDate: startDateMonth,
          endDate,
        });

        setRecentStats(weeklyStats);
        setMonthlyStats(monthlyStats);
      } catch (error) {
        console.error("Error fetching dashboard statistics:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardStats();
  }, [currentUser, loading]);

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
      // Set loading state to prevent any data fetching
      setLoading(true);
      // Reset states to prevent any Firebase access after logout
      setRecentStats({
        totalIncome: 0,
        totalExpenses: 0,
        totalTransactions: 0,
      });
      setMonthlyStats({
        totalIncome: 0,
        totalExpenses: 0,
        totalTransactions: 0,
      });

      await signOut();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast.error("Logout failed");
      // Reset loading state if logout fails
      setLoading(false);
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
    <Container fluid p={0} style={{ minHeight: "100vh" }}>
      <div style={{ padding: "1rem 2rem" }}>
        <Group justify="space-between" mb="xl">
          <Group>
            <IconWallet size={36} color="#228be6" />
            <Title order={1}>Digital Banking</Title>
          </Group>
          <Button onClick={handleLogout} variant="subtle">
            Log out
          </Button>
        </Group>

        {userData ? (
          <>
            {/* Main Content */}
            <Tabs value={activeTab} onChange={setActiveTab} style={{ width: "100%" }}>
              <Tabs.List grow mb="md">
                <Tabs.Tab value="overview" leftSection={<IconReportMoney size={16} />}>
                  Overview
                </Tabs.Tab>
                <Tabs.Tab value="payments" leftSection={<IconCash size={16} />}>
                  Payments
                </Tabs.Tab>
                <Tabs.Tab value="history" leftSection={<IconHistory size={16} />}>
                  History
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="overview">
                <Paper radius="md" withBorder p="lg" shadow="md" w="100%">
                  {/* Account Balance Card */}
                  <Card withBorder shadow="sm" radius="md" mb="lg" bg="blue.0" p="lg">
                    <Stack>
                      <Text c="dimmed" fw={500} size="sm">
                        AVAILABLE BALANCE
                      </Text>
                      <Text size="2.5rem" fw={700} c="blue.8">
                        ${userData.accountBalance.toFixed(2)}
                      </Text>
                      <Group>
                        <Text size="sm">Account Holder: {userData.displayName || "User"}</Text>
                        <Text size="sm">Email: {userData.email}</Text>
                      </Group>
                    </Stack>
                  </Card>

                  {/* Quick Stats */}
                  <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg" mb="lg">
                    <Card withBorder p="md" radius="md">
                      <Group justify="space-between" mb={5}>
                        <Text size="xs" c="dimmed" fw={500}>
                          RECENT INCOME
                        </Text>
                        <IconArrowDown size="1.2rem" stroke={1.5} color="teal" />
                      </Group>
                      <Text fw={700} size="xl">
                        +${recentStats.totalIncome.toFixed(2)}
                      </Text>
                      <Text size="xs" c="dimmed" mt={5}>
                        Last 7 days
                      </Text>
                    </Card>

                    <Card withBorder p="md" radius="md">
                      <Group justify="space-between" mb={5}>
                        <Text size="xs" c="dimmed" fw={500}>
                          RECENT SPENDING
                        </Text>
                        <IconArrowUp size="1.2rem" stroke={1.5} color="red" />
                      </Group>
                      <Text fw={700} size="xl">
                        -${recentStats.totalExpenses.toFixed(2)}
                      </Text>
                      <Text size="xs" c="dimmed" mt={5}>
                        Last 7 days
                      </Text>
                    </Card>

                    <Card withBorder p="md" radius="md">
                      <Group justify="space-between" mb={5}>
                        <Text size="xs" c="dimmed" fw={500}>
                          TOTAL TRANSACTIONS
                        </Text>
                        <IconCreditCard size="1.2rem" stroke={1.5} color="gray" />
                      </Group>
                      <Text fw={700} size="xl">
                        {monthlyStats.totalTransactions}
                      </Text>
                      <Text size="xs" c="dimmed" mt={5}>
                        This month
                      </Text>
                    </Card>
                  </SimpleGrid>

                  <Grid gutter="lg">
                    <Grid.Col span={{ base: 12, md: 8 }}>
                      <BankingStatistics />
                    </Grid.Col>
                    <Grid.Col span={{ base: 12, md: 4 }}>
                      <SecurityStatus />
                    </Grid.Col>
                  </Grid>

                  {/* Quick Actions */}
                  <Card withBorder shadow="sm" radius="md" mb="lg">
                    <Title order={4} mb="md">
                      Quick Actions
                    </Title>
                    <SimpleGrid cols={{ base: 2, sm: 4 }} spacing="md">
                      <Button
                        fullWidth
                        leftSection={<IconQrcode size={18} />}
                        variant="light"
                        onClick={() => setActiveTab("payments")}
                      >
                        Send Money
                      </Button>
                      <Button
                        fullWidth
                        leftSection={<IconQrcode size={18} />}
                        variant="light"
                        onClick={() => setActiveTab("payments")}
                      >
                        Receive Money
                      </Button>
                      <Button
                        fullWidth
                        leftSection={<IconNfc size={18} />}
                        variant="light"
                        onClick={startNFCPayment}
                        disabled={!isNFCSupported()}
                      >
                        NFC Payment
                      </Button>
                      <Button fullWidth leftSection={<IconCreditCard size={18} />} variant="light">
                        Cards
                      </Button>
                    </SimpleGrid>
                  </Card>

                  {/* Recent Transactions Preview */}
                  <Card withBorder shadow="sm" radius="md">
                    <Group justify="space-between" mb="md">
                      <Title order={4}>Recent Transactions</Title>
                      <Button variant="subtle" size="compact-sm" onClick={() => setActiveTab("history")}>
                        View All
                      </Button>
                    </Group>
                    <TransactionHistory limit={5} />
                  </Card>
                </Paper>
              </Tabs.Panel>

              <Tabs.Panel value="payments">
                <Paper radius="md" withBorder p="lg" shadow="md" w="100%">
                  <Title order={2} mb="lg">
                    Payment Methods
                  </Title>
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                    {/* QR Code Payment Section */}
                    <Card withBorder shadow="sm" radius="md" p="lg">
                      <Stack>
                        <Group>
                          <IconQrcode size={24} color="#228be6" />
                          <Title order={3}>QR Code Payments</Title>
                        </Group>
                        <Text size="sm" c="dimmed" mb="md">
                          Send or receive money quickly using QR codes. Scan a code to send money or create your own to
                          receive payments.
                        </Text>
                        <QRCodeTransaction />
                      </Stack>
                    </Card>

                    {/* NFC Payment Section */}
                    <Card withBorder shadow="sm" radius="md" p="lg">
                      <Stack>
                        <Group>
                          <IconNfc size={24} color="#228be6" />
                          <Title order={3}>NFC Payments</Title>
                        </Group>
                        <Text size="sm" c="dimmed" mb="md">
                          {isNFCSupported()
                            ? "Tap your device to send or receive payments using NFC technology."
                            : "NFC is not supported on your device or browser"}
                        </Text>
                        <Group grow>
                          <Button
                            leftSection={<IconNfc size={20} />}
                            onClick={startNFCPayment}
                            disabled={!isNFCSupported()}
                          >
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
                      </Stack>
                    </Card>
                  </SimpleGrid>
                </Paper>
              </Tabs.Panel>

              <Tabs.Panel value="history">
                <Paper radius="md" withBorder p="lg" shadow="md" w="100%">
                  <Title order={2} mb="lg">
                    Transaction History
                  </Title>
                  <TransactionHistory />
                </Paper>
              </Tabs.Panel>
            </Tabs>

            {/* Modals */}
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
          <Paper radius="md" withBorder p="xl" shadow="md">
            <Stack align="center" gap="md">
              <IconWallet size={48} opacity={0.5} />
              <Text>Loading account information...</Text>
            </Stack>
          </Paper>
        )}
      </div>
    </Container>
  );
}
