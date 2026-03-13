/**
 * India Stack Integration — Aadhaar eKYC + CCA eSign API stubs.
 *
 * Implements mock API interfaces matching the real India Stack specifications:
 * - Aadhaar e-KYC: UIDAI-based identity verification for Project Proponents and RQPs
 * - eSign: CCA-licensed digital signatures (Protean eGov / NSDL) for MoM finalization
 *
 * In production, these would connect to actual India Stack API providers:
 * - UIDAI (Aadhaar e-KYC): https://uidai.gov.in
 * - Protean eGov (eSign): https://www.protean-tinpan.com
 *
 * For the hackathon, we provide realistic mock implementations that
 * demonstrate the integration architecture and data flow.
 */

// ─────────────────────── Aadhaar e-KYC ───────────────────────────────

export interface AadhaarEKYCRequest {
  /** 12-digit Aadhaar number (masked for security) */
  aadhaarNumber: string;
  /** OTP received on Aadhaar-linked mobile */
  otp: string;
  /** Transaction ID for tracking */
  transactionId: string;
  /** Consent flag — mandatory per UIDAI guidelines */
  consent: boolean;
}

export interface AadhaarEKYCResponse {
  success: boolean;
  transactionId: string;
  /** Verified identity data from UIDAI */
  identity?: {
    name: string;
    dateOfBirth: string;
    gender: 'M' | 'F' | 'T';
    /** Masked address (last 4 chars visible) */
    address: string;
    /** Photo (base64-encoded JPEG, optional) */
    photo?: string;
    /** Aadhaar last 4 digits (full number never stored) */
    maskedAadhaar: string;
    /** Verification timestamp */
    verifiedAt: string;
  };
  /** Error details if verification failed */
  error?: {
    code: string;
    message: string;
  };
}

export type EKYCStatus = 'pending' | 'otp_sent' | 'verified' | 'failed';

/**
 * Initiate Aadhaar OTP for e-KYC verification.
 * In production: Calls UIDAI OTP API via ASA (Authentication Service Agency).
 */
export async function initiateAadhaarOTP(
  aadhaarNumber: string
): Promise<{ success: boolean; transactionId: string; message: string }> {
  // Validate format (12 digits)
  if (!/^\d{12}$/.test(aadhaarNumber)) {
    return {
      success: false,
      transactionId: '',
      message: 'Invalid Aadhaar number format. Must be 12 digits.',
    };
  }

  // Mock: Generate transaction ID and simulate OTP send
  const transactionId = `EKYC-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  // Simulate API latency
  await new Promise(resolve => setTimeout(resolve, 800));

  return {
    success: true,
    transactionId,
    message: 'OTP sent to Aadhaar-linked mobile number ending in ****56.',
  };
}

/**
 * Verify Aadhaar OTP and retrieve e-KYC data.
 * In production: Calls UIDAI e-KYC API with signed XML request.
 */
export async function verifyAadhaarEKYC(
  request: AadhaarEKYCRequest
): Promise<AadhaarEKYCResponse> {
  if (!request.consent) {
    return {
      success: false,
      transactionId: request.transactionId,
      error: {
        code: 'CONSENT_REQUIRED',
        message: 'User consent is mandatory for Aadhaar e-KYC as per UIDAI guidelines.',
      },
    };
  }

  // Simulate API latency
  await new Promise(resolve => setTimeout(resolve, 1200));

  // Mock: Accept any 6-digit OTP for demo
  if (!/^\d{6}$/.test(request.otp)) {
    return {
      success: false,
      transactionId: request.transactionId,
      error: {
        code: 'INVALID_OTP',
        message: 'Invalid OTP. Please enter the 6-digit OTP sent to your mobile.',
      },
    };
  }

  // Return mock verified identity
  const maskedAadhaar = `XXXX-XXXX-${request.aadhaarNumber.slice(-4)}`;

  return {
    success: true,
    transactionId: request.transactionId,
    identity: {
      name: 'Rajesh Kumar Verma',
      dateOfBirth: '1985-06-15',
      gender: 'M',
      address: 'H.No. XX, Ward XX, ****nagar, Raipur, Chhattisgarh - 492001',
      maskedAadhaar,
      verifiedAt: new Date().toISOString(),
    },
  };
}


// ─────────────────────── CCA eSign ───────────────────────────────────

export interface ESignRequest {
  /** Document hash (SHA-256) to be signed */
  documentHash: string;
  /** Signer's Aadhaar-verified name */
  signerName: string;
  /** Designation of the signer */
  signerDesignation: string;
  /** Purpose of signing */
  purpose: string;
  /** Transaction ID from e-KYC verification */
  ekycTransactionId: string;
  /** OTP for eSign authorization */
  otp: string;
}

export interface ESignResponse {
  success: boolean;
  /** Digital signature details */
  signature?: {
    /** PKCS#7 signature (base64-encoded, mock) */
    pkcs7Signature: string;
    /** X.509 certificate serial number */
    certificateSerial: string;
    /** Certificate issuer (CCA-licensed CA) */
    issuer: string;
    /** Certificate validity */
    validFrom: string;
    validTo: string;
    /** Signed document hash */
    documentHash: string;
    /** Signature timestamp (RFC 3161) */
    signedAt: string;
    /** eSign transaction ID */
    esignTransactionId: string;
  };
  error?: {
    code: string;
    message: string;
  };
}

export type ESignStatus = 'pending' | 'otp_sent' | 'signed' | 'failed' | 'expired';

/**
 * Initiate eSign OTP for document signing.
 * In production: Calls Protean/NSDL eSign API to trigger Aadhaar OTP.
 */
export async function initiateESignOTP(
  signerName: string,
  documentHash: string
): Promise<{ success: boolean; transactionId: string; message: string }> {
  const transactionId = `ESIGN-${Date.now()}-${Math.random().toString(36).substring(7)}`;

  // Simulate API latency
  await new Promise(resolve => setTimeout(resolve, 600));

  return {
    success: true,
    transactionId,
    message: `eSign OTP sent for document signing by ${signerName}.`,
  };
}

/**
 * Execute eSign — apply digital signature to document.
 * In production: Calls CCA-licensed ESP (e.g., Protean eGov) to generate
 * short-term X.509 certificate and apply PKCS#7 signature.
 */
export async function executeESign(
  request: ESignRequest
): Promise<ESignResponse> {
  // Validate OTP format
  if (!/^\d{6}$/.test(request.otp)) {
    return {
      success: false,
      error: {
        code: 'INVALID_OTP',
        message: 'Invalid OTP for eSign authorization.',
      },
    };
  }

  // Simulate signing latency
  await new Promise(resolve => setTimeout(resolve, 1500));

  const now = new Date();
  const validTo = new Date(now);
  validTo.setMinutes(validTo.getMinutes() + 30); // Short-term certificate: 30 min

  // Generate mock PKCS#7 signature (base64 representation)
  const mockSignatureBytes = new Uint8Array(256);
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(mockSignatureBytes);
  } else {
    for (let i = 0; i < mockSignatureBytes.length; i++) {
      mockSignatureBytes[i] = Math.floor(Math.random() * 256);
    }
  }
  const mockSignature = btoa(String.fromCharCode(...mockSignatureBytes));

  return {
    success: true,
    signature: {
      pkcs7Signature: mockSignature,
      certificateSerial: `CCA-${Date.now().toString(16).toUpperCase()}`,
      issuer: 'CN=Protean eGov Technologies, O=NSDL e-Governance, C=IN, CCA Licensed',
      validFrom: now.toISOString(),
      validTo: validTo.toISOString(),
      documentHash: request.documentHash,
      signedAt: now.toISOString(),
      esignTransactionId: `ESIGN-TX-${Date.now()}`,
    },
  };
}

/**
 * Verify an eSign signature against a document hash.
 * In production: Validates the PKCS#7 signature chain against CCA root certificates.
 */
export async function verifyESignature(
  documentHash: string,
  pkcs7Signature: string
): Promise<{ valid: boolean; signerName?: string; signedAt?: string; issuer?: string }> {
  // Simulate verification
  await new Promise(resolve => setTimeout(resolve, 500));

  // Mock: All signatures are valid in demo mode
  if (pkcs7Signature && pkcs7Signature.length > 10) {
    return {
      valid: true,
      signerName: 'Authorized CECB Official',
      signedAt: new Date().toISOString(),
      issuer: 'Protean eGov Technologies (CCA Licensed)',
    };
  }

  return { valid: false };
}
