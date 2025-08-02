import { collection, getDocs, orderBy, query, Timestamp, where } from "firebase/firestore";
import type { Transaction } from "../types";
import { db } from "./firebase";

interface StatisticsPeriod {
  startDate: Date;
  endDate: Date;
}

interface TransactionStatistics {
  totalIncome: number;
  totalExpenses: number;
  totalTransactions: number;
  categories: {
    [key: string]: number;
  };
}

/**
 * Get transaction statistics for a specific user within a date range
 */
export async function getTransactionStatistics(
  userId: string,
  period: StatisticsPeriod
): Promise<TransactionStatistics> {
  const result: TransactionStatistics = {
    totalIncome: 0,
    totalExpenses: 0,
    totalTransactions: 0,
    categories: {},
  };

  try {
    // Get transactions where user is receiver (income)
    const receivedQuery = query(
      collection(db, "transactions"),
      where("receiverId", "==", userId),
      where("status", "==", "completed"),
      where("timestamp", ">=", Timestamp.fromDate(period.startDate)),
      where("timestamp", "<=", Timestamp.fromDate(period.endDate)),
      orderBy("timestamp", "desc")
    );

    // Get transactions where user is sender (expenses)
    const sentQuery = query(
      collection(db, "transactions"),
      where("senderId", "==", userId),
      where("status", "==", "completed"),
      where("timestamp", ">=", Timestamp.fromDate(period.startDate)),
      where("timestamp", "<=", Timestamp.fromDate(period.endDate)),
      orderBy("timestamp", "desc")
    );

    const [receivedSnapshot, sentSnapshot] = await Promise.all([getDocs(receivedQuery), getDocs(sentQuery)]);

    // Process received transactions (income)
    receivedSnapshot.docs.forEach((doc) => {
      const transaction = { ...doc.data(), id: doc.id } as Transaction;
      result.totalIncome += transaction.amount;
      result.totalTransactions++;

      // Track by category
      if (!result.categories[transaction.transactionType]) {
        result.categories[transaction.transactionType] = 0;
      }
      result.categories[transaction.transactionType] += transaction.amount;
    });

    // Process sent transactions (expenses)
    sentSnapshot.docs.forEach((doc) => {
      const transaction = { ...doc.data(), id: doc.id } as Transaction;
      result.totalExpenses += transaction.amount;
      result.totalTransactions++;

      // Track by category
      if (!result.categories[transaction.transactionType]) {
        result.categories[transaction.transactionType] = 0;
      }
      result.categories[transaction.transactionType] += transaction.amount;
    });

    return result;
  } catch (error) {
    console.error("Error fetching transaction statistics:", error);
    return result;
  }
}

/**
 * Get recent transaction statistics for the last N days
 */
export function getRecentTransactionStatistics(userId: string, days = 7) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return getTransactionStatistics(userId, { startDate, endDate });
}

/**
 * Get monthly transaction statistics
 */
export function getMonthlyTransactionStatistics(userId: string) {
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  return getTransactionStatistics(userId, { startDate, endDate });
}
