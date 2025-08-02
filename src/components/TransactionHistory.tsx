import { Badge, Card, Table, Text, Title } from "@mantine/core";
import { collection, limit as firestoreLimit, getDocs, orderBy, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { db } from "../services/firebase";
import type { Transaction } from "../types";

interface TransactionHistoryProps {
  limit?: number;
}

export default function TransactionHistory({ limit }: TransactionHistoryProps) {
  const { currentUser } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTransactions() {
      if (!currentUser) return;

      try {
        setLoading(true);

        // Create base queries
        let sentQueryBase = query(
          collection(db, "transactions"),
          where("senderId", "==", currentUser.uid),
          orderBy("timestamp", "desc")
        );

        let receivedQueryBase = query(
          collection(db, "transactions"),
          where("receiverId", "==", currentUser.uid),
          orderBy("timestamp", "desc")
        );

        // Apply limit if provided
        if (limit) {
          sentQueryBase = query(sentQueryBase, firestoreLimit(limit));
          receivedQueryBase = query(receivedQueryBase, firestoreLimit(limit));
        }

        const [sentSnapshot, receivedSnapshot] = await Promise.all([
          getDocs(sentQueryBase),
          getDocs(receivedQueryBase),
        ]);

        const sentTransactions = sentSnapshot.docs.map(
          (doc) =>
            ({
              ...doc.data(),
              id: doc.id,
              timestamp: doc.data().timestamp?.toDate() || new Date(),
            } as Transaction)
        );

        const receivedTransactions = receivedSnapshot.docs.map(
          (doc) =>
            ({
              ...doc.data(),
              id: doc.id,
              timestamp: doc.data().timestamp?.toDate() || new Date(),
            } as Transaction)
        );

        // Combine and sort by timestamp
        const allTransactions = [...sentTransactions, ...receivedTransactions].sort(
          (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
        );

        // Apply final limit if provided (after combining both sent and received)
        const limitedTransactions = limit ? allTransactions.slice(0, limit) : allTransactions;

        setTransactions(limitedTransactions);
      } catch (error) {
        console.error("Error fetching transactions:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTransactions();
  }, [currentUser, limit]);

  const getTransactionTypeColor = (type: string, isSender: boolean) => {
    if (type === "transfer") {
      return isSender ? "red" : "green";
    }
    if (type === "deposit") return "green";
    if (type === "withdrawal") return "red";
    return "blue";
  };

  if (loading) {
    return <Text>Loading transaction history...</Text>;
  }

  return (
    <Card withBorder shadow="sm" radius="md" mb="lg">
      <Title order={3} mb="md">
        Transaction History
      </Title>
      {transactions.length === 0 ? (
        <Text>No transaction history found.</Text>
      ) : (
        <Table>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Type</Table.Th>
              <Table.Th>Amount</Table.Th>
              <Table.Th>Description</Table.Th>
              <Table.Th>Date</Table.Th>
              <Table.Th>Status</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {transactions.map((transaction) => {
              const isSender = transaction.senderId === currentUser?.uid;
              return (
                <Table.Tr key={transaction.id}>
                  <Table.Td>
                    <Badge color={getTransactionTypeColor(transaction.transactionType, isSender)}>
                      {isSender ? "Sent" : "Received"} ({transaction.transactionType})
                    </Badge>
                  </Table.Td>
                  <Table.Td style={{ color: isSender ? "red" : "green" }}>
                    {isSender ? "-" : "+"} ${transaction.amount.toFixed(2)}
                  </Table.Td>
                  <Table.Td>{transaction.description}</Table.Td>
                  <Table.Td>{transaction.timestamp.toLocaleDateString()}</Table.Td>
                  <Table.Td>
                    <Badge
                      color={
                        transaction.status === "completed"
                          ? "green"
                          : transaction.status === "failed"
                          ? "red"
                          : "yellow"
                      }
                    >
                      {transaction.status}
                    </Badge>
                  </Table.Td>
                </Table.Tr>
              );
            })}
          </Table.Tbody>
        </Table>
      )}
    </Card>
  );
}
