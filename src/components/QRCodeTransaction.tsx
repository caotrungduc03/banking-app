import { Button, Card, Group, Modal, NumberInput, Stack, Tabs, Text, TextInput, Title } from "@mantine/core";
import { useForm } from "@mantine/form";
import { IconCurrencyDollar, IconDeviceCameraPhone, IconQrcode } from "@tabler/icons-react";
import jsQR from "jsqr";
import { QRCodeSVG } from "qrcode.react";
import { useRef, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../hooks/useAuth";
import { transferMoney } from "../services/transaction";

interface QRTransactionFormValues {
  amount: number;
  description: string;
}

export default function QRCodeTransaction() {
  const { currentUser, userData, refreshUserData } = useAuth();
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>("generate");
  const [qrCodeValue, setQrCodeValue] = useState<string>("");
  const [scannedValue, setScannedValue] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scannerActive, setScannerActive] = useState(false);

  const form = useForm<QRTransactionFormValues>({
    initialValues: {
      amount: 0,
      description: "",
    },
    validate: {
      amount: (value) => (value > 0 ? null : "Amount must be greater than 0"),
      description: (value) => (value.trim() ? null : "Description is required"),
    },
  });

  const generateQRCode = (values: QRTransactionFormValues) => {
    if (!currentUser || !userData) return;

    // Create the QR code data
    const qrData = {
      type: "payment",
      senderId: "",
      receiverId: currentUser.uid,
      amount: values.amount,
      description: values.description,
      timestamp: new Date().getTime(),
    };

    // Convert to JSON string
    const qrValue = JSON.stringify(qrData);
    setQrCodeValue(qrValue);
  };

  const startQRScanner = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.error("Camera access is not supported by your browser");
      return;
    }

    try {
      setScannerActive(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();

        // Start scanning for QR codes
        checkVideoFrame();
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("Unable to access camera");
      setScannerActive(false);
    }
  };

  const stopQRScanner = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();

      tracks.forEach((track) => {
        track.stop();
      });

      videoRef.current.srcObject = null;
      setScannerActive(false);
    }
  };

  const checkVideoFrame = () => {
    if (!scannerActive) return;

    if (videoRef.current && canvasRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const context = canvas.getContext("2d");
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Get image data for QR code scanning
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

        // Scan for QR code in the image
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          // QR code found!
          console.log("QR code detected:", code.data);

          // Stop scanning and process the QR data
          stopQRScanner();
          processScannedQR(code.data);
        }
      }
    }

    // Schedule the next frame check
    if (scannerActive) {
      requestAnimationFrame(checkVideoFrame);
    }
  };

  const processScannedQR = async (qrData: string) => {
    try {
      setScannedValue(qrData);
      const paymentData = JSON.parse(qrData);

      if (paymentData.type !== "payment") {
        toast.error("Invalid QR code: Not a payment QR");
        return;
      }

      if (!currentUser) {
        toast.error("You must be logged in to make payments");
        return;
      }

      setLoading(true);

      const result = await transferMoney({
        senderId: currentUser.uid,
        receiverId: paymentData.receiverId,
        amount: paymentData.amount,
        description: paymentData.description,
        transactionType: "transfer",
      });

      if (result.success) {
        refreshUserData();
        toast.success("Payment successful!");
        stopQRScanner();
        setQrModalOpen(false);
      } else {
        toast.error(`Payment failed: ${result.error}`);
      }
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Failed to process payment");
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab: string | null) => {
    setActiveTab(tab);
    if (tab === "scan") {
      startQRScanner();
    } else {
      stopQRScanner();
    }
  };

  const handleCloseModal = () => {
    stopQRScanner();
    setQrModalOpen(false);
    setQrCodeValue("");
    setScannedValue("");
  };

  return (
    <>
      <Button leftSection={<IconQrcode size={20} />} onClick={() => setQrModalOpen(true)} fullWidth>
        QR Code Payment
      </Button>

      <Modal opened={qrModalOpen} onClose={handleCloseModal} title="QR Code Transactions" centered>
        <Tabs value={activeTab} onChange={handleTabChange}>
          <Tabs.List grow>
            <Tabs.Tab value="generate" leftSection={<IconCurrencyDollar size={16} />}>
              Receive Money
            </Tabs.Tab>
            <Tabs.Tab value="scan" leftSection={<IconDeviceCameraPhone size={16} />}>
              Send Money
            </Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="generate" pt="xs">
            <Stack>
              {qrCodeValue ? (
                <Card withBorder p="md" radius="md">
                  <Stack align="center">
                    <Title order={4}>Scan to Pay Me</Title>
                    <QRCodeSVG value={qrCodeValue} size={200} />
                    <Text size="sm">Show this QR code to the sender</Text>
                  </Stack>
                </Card>
              ) : (
                <form onSubmit={form.onSubmit(generateQRCode)}>
                  <Stack>
                    <NumberInput
                      label="Amount"
                      placeholder="Enter amount to receive"
                      required
                      min={0.01}
                      step={0.01}
                      decimalScale={2}
                      {...form.getInputProps("amount")}
                    />

                    <TextInput
                      label="Description"
                      placeholder="What is this payment for?"
                      required
                      {...form.getInputProps("description")}
                    />

                    <Button type="submit">Generate QR Code</Button>
                  </Stack>
                </form>
              )}

              {qrCodeValue && (
                <Button variant="outline" onClick={() => setQrCodeValue("")}>
                  Create New QR Code
                </Button>
              )}
            </Stack>
          </Tabs.Panel>

          <Tabs.Panel value="scan" pt="xs">
            <Stack align="center">
              {scannerActive && (
                <>
                  <Text size="sm">Point your camera at a QR code</Text>
                  <Group justify="center">
                    <div style={{ width: "100%", maxWidth: 300, position: "relative" }}>
                      <video ref={videoRef} style={{ width: "100%", borderRadius: 8 }} playsInline />
                      <canvas ref={canvasRef} style={{ display: "none" }} />
                    </div>
                  </Group>
                </>
              )}

              {!scannerActive && (
                <>
                  <Text>Camera access is required to scan QR codes</Text>
                  <Button onClick={startQRScanner}>Enable Camera</Button>
                </>
              )}

              {/* For demo purposes, allow manual entry of QR data */}
              <Card withBorder shadow="sm" p="md" mt="md" style={{ width: "100%" }}>
                <Title order={5}>Demo: Enter QR Data Manually</Title>
                <TextInput
                  placeholder='{"type":"payment","receiverId":"userid","amount":10,"description":"test"}'
                  onChange={(e) => setScannedValue(e.target.value)}
                  value={scannedValue}
                />
                <Button
                  fullWidth
                  mt="sm"
                  onClick={() => processScannedQR(scannedValue)}
                  loading={loading}
                  disabled={!scannedValue}
                >
                  Process Payment
                </Button>
              </Card>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Modal>
    </>
  );
}
