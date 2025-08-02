import { addDoc, collection, doc, getDoc, Timestamp, updateDoc } from "firebase/firestore";
import type { TransactionStatus, TransactionType } from "../types";
import { db } from "./firebase";

interface TransferOptions {
  senderId: string;
  receiverId: string;
  amount: number;
  description: string;
  transactionType: TransactionType;
}

export async function transferMoney({
  senderId,
  receiverId,
  amount,
  description,
  transactionType = "transfer",
}: TransferOptions): Promise<{ success: boolean; transactionId?: string; error?: string }> {
  try {
    // Check if sender exists and has sufficient funds
    const senderRef = doc(db, "users", senderId);
    const senderDoc = await getDoc(senderRef);

    if (!senderDoc.exists()) {
      return { success: false, error: "Sender account not found" };
    }

    const senderData = senderDoc.data();
    if (senderData.accountBalance < amount) {
      return { success: false, error: "Insufficient funds" };
    }

    // Check if receiver exists
    const receiverRef = doc(db, "users", receiverId);
    const receiverDoc = await getDoc(receiverRef);

    if (!receiverDoc.exists()) {
      return { success: false, error: "Receiver account not found" };
    }

    let status: TransactionStatus = "pending";

    // Create transaction record
    const transactionRef = await addDoc(collection(db, "transactions"), {
      senderId,
      receiverId,
      amount,
      description,
      timestamp: Timestamp.now(),
      status,
      transactionType,
    });

    try {
      // Update sender's balance
      await updateDoc(senderRef, {
        accountBalance: senderData.accountBalance - amount,
      });

      // Update receiver's balance
      const receiverData = receiverDoc.data();
      await updateDoc(receiverRef, {
        accountBalance: receiverData.accountBalance + amount,
      });

      // Mark transaction as completed
      status = "completed";
      await updateDoc(doc(db, "transactions", transactionRef.id), {
        status,
      });

      return { success: true, transactionId: transactionRef.id };
    } catch (error) {
      // If any part fails, mark transaction as failed
      await updateDoc(doc(db, "transactions", transactionRef.id), {
        status: "failed",
      });

      return { success: false, error: "Transaction processing failed" };
    }
  } catch (error) {
    console.error("Transfer error:", error);
    return { success: false, error: "Transaction failed" };
  }
}
