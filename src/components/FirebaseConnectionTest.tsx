import { Badge, Box, Button, Code, Paper, Text } from "@mantine/core";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { useEffect, useState } from "react";
import { app, db } from "../services/firebase";

const FirebaseConnectionTest = () => {
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "connected" | "error" | "not_authenticated">(
    "checking"
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const auth = getAuth(app);

  // Function to test the connection
  const testConnection = async () => {
    setConnectionStatus("checking");
    setErrorMessage(null);
    setErrorDetails(null);

    try {
      console.log("Testing Firebase configuration...");

      // Check Firebase initialization
      if (!app) {
        throw new Error("Firebase app not initialized");
      }

      // Check authentication state
      if (!isAuthenticated) {
        console.log("User is not authenticated. Configuration check only.");
        setConnectionStatus("not_authenticated");
        return;
      }

      // If authenticated, try a simple query to test connection
      console.log("User is authenticated. Testing Firestore connection...");
      const q = query(collection(db, "users"), limit(1));
      await getDocs(q);

      setConnectionStatus("connected");
      console.log("Firestore connection successful");
    } catch (error: any) {
      console.error("Firebase connection error:", error);
      setConnectionStatus("error");
      setErrorMessage(error.message || "Unknown error connecting to Firebase");
      setErrorDetails({
        code: error.code,
        name: error.name,
        stack: error.stack,
      });
    }
  };

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      testConnection();
    });

    return () => unsubscribe();
  }, []);

  return (
    <Paper p="md" withBorder>
      <Box>
        <Text fw={500} size="lg" mb="xs">
          Trạng thái kết nối Firebase
        </Text>

        {connectionStatus === "checking" && <Badge color="yellow">Đang kiểm tra kết nối...</Badge>}

        {connectionStatus === "connected" && <Badge color="green">Đã kết nối thành công đến Firebase</Badge>}

        {connectionStatus === "not_authenticated" && (
          <>
            <Badge color="blue" mb="xs">
              Đã kết nối cấu hình
            </Badge>
            <Text size="sm" color="dimmed">
              Cần đăng nhập để kiểm tra quyền truy cập Firestore
            </Text>
          </>
        )}

        {connectionStatus === "error" && (
          <>
            <Badge color="red" mb="xs">
              Lỗi kết nối
            </Badge>
            <Text color="red" size="sm">
              {errorMessage}
            </Text>
            {errorDetails && (
              <Box mt="xs">
                <Text size="sm" fw={500}>
                  Chi tiết lỗi:
                </Text>
                <Code block>{JSON.stringify(errorDetails, null, 2)}</Code>
              </Box>
            )}
          </>
        )}

        <Text size="sm" mt="md">
          Firebase config: {app.options.apiKey ? "Đã cấu hình" : "Chưa cấu hình"}
        </Text>
        <Text size="sm">Project ID: {app.options.projectId}</Text>

        <Button mt="md" onClick={testConnection} size="sm" variant="light">
          Kiểm tra lại kết nối
        </Button>
      </Box>
    </Paper>
  );
};

export default FirebaseConnectionTest;
