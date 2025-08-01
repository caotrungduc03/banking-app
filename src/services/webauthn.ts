// Define types for WebAuthn responses
interface WebAuthnRegistrationResponse {
  id: string;
  rawId: Uint8Array;
  response: {
    clientDataJSON: Uint8Array;
    attestationObject: Uint8Array;
  };
  type: string;
  clientExtensionResults: Record<string, unknown>;
}

interface WebAuthnAuthenticationResponse {
  id: string;
  rawId: Uint8Array;
  response: {
    clientDataJSON: Uint8Array;
    authenticatorData: Uint8Array;
    signature: Uint8Array;
    userHandle?: Uint8Array;
  };
  type: string;
  clientExtensionResults: Record<string, unknown>;
}

// Mock WebAuthn functionality for demo purposes
export async function generateWebAuthnRegistrationOptions(userId: string, username: string) {
  // In a real app, this would call the server to get registration options
  console.log(`Generating registration options for user ${username} with ID ${userId}`);
  return {
    challenge: 'mock-challenge',
    rp: {
      name: 'Banking App',
      id: window.location.hostname
    },
    user: {
      id: userId,
      name: username,
      displayName: username
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -7 } // ES256
    ]
  };
}

export async function verifyAndSaveWebAuthnRegistration(userId: string, response: WebAuthnRegistrationResponse) {
  // In a real app, this would send the response to the server for verification
  console.log('Verifying registration response', response);
  console.log(`Saving credential for user ${userId}`);
  
  // Mock successful verification
  return {
    verified: true,
    registrationInfo: {
      fmt: 'none',
      counter: 0
    }
  };
}

export async function generateWebAuthnAuthenticationOptions(userId: string) {
  // In a real app, this would call the server to get authentication options
  console.log(`Generating authentication options for user ${userId}`);
  return {
    challenge: 'mock-challenge',
    rpId: window.location.hostname,
    allowCredentials: [],
    userVerification: 'preferred'
  };
}

export async function verifyWebAuthnAuthentication(userId: string, response: WebAuthnAuthenticationResponse) {
  // In a real app, this would send the response to the server for verification
  console.log('Verifying authentication response', response);
  console.log(`Authenticating user ${userId}`);
  
  // Mock successful verification
  return {
    verified: true,
    userId
  };
}

// Register a new WebAuthn credential
export async function registerWebAuthnCredential(userId: string, username: string) {
  try {
    const options = await generateWebAuthnRegistrationOptions(userId, username);
    
    // In a real app, we would use the actual startRegistration function
    // For now, we'll mock it to avoid browser API issues
    console.log('Starting WebAuthn registration with options:', options);
    
    // Mock registration response
    const response: WebAuthnRegistrationResponse = {
      id: 'mock-credential-id',
      rawId: new Uint8Array([1, 2, 3, 4]),
      response: {
        clientDataJSON: new Uint8Array([1, 2, 3, 4]),
        attestationObject: new Uint8Array([1, 2, 3, 4])
      },
      type: 'public-key',
      clientExtensionResults: {}
    };
    
    return await verifyAndSaveWebAuthnRegistration(userId, response);
  } catch (error) {
    console.error('Error registering WebAuthn credential:', error);
    throw error;
  }
}

// Authenticate with WebAuthn
export async function authenticateWithWebAuthn(userId: string) {
  try {
    const options = await generateWebAuthnAuthenticationOptions(userId);
    
    // In a real app, we would use the actual startAuthentication function
    // For now, we'll mock it to avoid browser API issues
    console.log('Starting WebAuthn authentication with options:', options);
    
    // Mock authentication response
    const response: WebAuthnAuthenticationResponse = {
      id: 'mock-credential-id',
      rawId: new Uint8Array([1, 2, 3, 4]),
      response: {
        clientDataJSON: new Uint8Array([1, 2, 3, 4]),
        authenticatorData: new Uint8Array([1, 2, 3, 4]),
        signature: new Uint8Array([1, 2, 3, 4]),
        userHandle: new Uint8Array([1, 2, 3, 4])
      },
      type: 'public-key',
      clientExtensionResults: {}
    };
    
    return await verifyWebAuthnAuthentication(userId, response);
  } catch (error) {
    console.error('Error authenticating with WebAuthn:', error);
    throw error;
  }
} 
