import { collection, addDoc, doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import type { NFCPaymentData, TransactionStatus } from '../types';

// Check if NFC is available in the browser
export function isNFCSupported(): boolean {
  return 'NDEFReader' in window;
}

// Start NFC scanning
export async function startNFCScanning(
  onReading: (data: NFCPaymentData) => void,
  onError: (error: Error) => void
) {
  if (!isNFCSupported()) {
    onError(new Error('NFC is not supported on this device or browser'));
    return;
  }

  try {
    // @ts-expect-error - NDEFReader is not in the TypeScript types yet
    const reader = new NDEFReader();
    await reader.scan();
    
    reader.addEventListener('reading', ({ message }: { message: { records: Array<{ recordType: string, data: ArrayBuffer }> } }) => {
      try {
        // Process the NDEF message
        for (const record of message.records) {
          if (record.recordType === 'text') {
            const textDecoder = new TextDecoder();
            const text = textDecoder.decode(record.data);
            
            // Parse the JSON data
            const paymentData: NFCPaymentData = JSON.parse(text);
            onReading(paymentData);
            break;
          }
        }
      } catch (error) {
        onError(error instanceof Error ? error : new Error('Error processing NFC data'));
      }
    });

    reader.addEventListener('error', ({ message }: { message: string }) => {
      onError(new Error(message));
    });
  } catch (error) {
    onError(error instanceof Error ? error : new Error('Error starting NFC scan'));
  }
}

// Write NFC data to a tag
export async function writeNFCData(
  paymentData: NFCPaymentData,
  onSuccess: () => void,
  onError: (error: Error) => void
) {
  if (!isNFCSupported()) {
    onError(new Error('NFC is not supported on this device or browser'));
    return;
  }

  try {
    // Convert payment data to JSON string
    const jsonString = JSON.stringify(paymentData);
    
    // @ts-expect-error - NDEFReader is not in the TypeScript types yet
    const writer = new NDEFReader();
    await writer.write({
      records: [
        {
          recordType: 'text',
          data: jsonString,
        },
      ],
    });
    
    onSuccess();
  } catch (error) {
    onError(error instanceof Error ? error : new Error('Error writing NFC data'));
  }
}

// Process an NFC payment transaction
export async function processNFCPayment(
  senderId: string,
  paymentData: NFCPaymentData,
  onSuccess: (transactionId: string) => void,
  onError: (error: Error) => void
) {
  try {
    // Get sender's account
    const senderRef = doc(db, 'users', senderId);
    const senderDoc = await getDoc(senderRef);
    
    if (!senderDoc.exists()) {
      throw new Error('Sender account not found');
    }
    
    const senderData = senderDoc.data();
    
    // Check if sender has enough balance
    if (senderData.accountBalance < paymentData.amount) {
      throw new Error('Insufficient funds');
    }
    
    // Get receiver's account
    const receiverRef = doc(db, 'users', paymentData.receiverId);
    const receiverDoc = await getDoc(receiverRef);
    
    if (!receiverDoc.exists()) {
      throw new Error('Receiver account not found');
    }
    
    // Create transaction record
    const transactionRef = await addDoc(collection(db, 'transactions'), {
      senderId,
      receiverId: paymentData.receiverId,
      amount: paymentData.amount,
      timestamp: new Date(),
      status: 'pending' as TransactionStatus,
      transactionType: 'nfc',
      description: paymentData.description || 'NFC Payment',
    });
    
    // Update sender's balance
    await updateDoc(senderRef, {
      accountBalance: senderData.accountBalance - paymentData.amount,
    });
    
    // Update receiver's balance
    const receiverData = receiverDoc.data();
    await updateDoc(receiverRef, {
      accountBalance: receiverData.accountBalance + paymentData.amount,
    });
    
    // Update transaction status to completed
    await updateDoc(transactionRef, {
      status: 'completed' as TransactionStatus,
    });
    
    onSuccess(transactionRef.id);
  } catch (error) {
    onError(error instanceof Error ? error : new Error('Error processing payment'));
  }
} 
