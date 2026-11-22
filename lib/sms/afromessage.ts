/**
 * AfroMessage SMS Gateway Client.
 * Routes automated maternal & newborn SMS across Ethio Telecom & Safaricom Ethiopia.
 */

export interface SmsSendResult {
  successful: boolean;
  gatewayMessageId: string;
  status: "submitted" | "sent" | "delivered" | "failed";
  errorMessage?: string;
  rawPayload: Record<string, unknown>;
}

export async function sendSms(
  toPhone: string,
  message: string,
  callbackToken?: string
): Promise<SmsSendResult> {
  const isLive = process.env.SMS_LIVE === "1";
  const baseUrl = process.env.AFROMESSAGE_BASE_URL || "https://api.afromessage.com/api";
  const token = process.env.AFROMESSAGE_TOKEN || "";
  const identifierId = process.env.AFROMESSAGE_IDENTIFIER_ID || "";
  const senderName = process.env.AFROMESSAGE_SENDER_NAME || "";
  const callbackBase = process.env.CALLBACK_BASE_URL || "";

  // Normalize recipient to E.164
  let recipient = toPhone.trim().replace(/\s+/g, "");
  if (recipient.startsWith("09") || recipient.startsWith("07")) {
    recipient = "+251" + recipient.substring(1);
  } else if (recipient.startsWith("251")) {
    recipient = "+" + recipient;
  }

  // Sandbox Mode: If live sending disabled, return simulated success
  if (!isLive) {
    const fakeId = `mock_afro_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    return {
      successful: true,
      gatewayMessageId: fakeId,
      status: "submitted",
      rawPayload: {
        mode: "sandbox",
        provider: "AfroMessage Simulated",
        to: recipient,
        message,
        token: callbackToken,
      },
    };
  }

  if (!token) {
    return {
      successful: false,
      gatewayMessageId: "",
      status: "failed",
      errorMessage: "AFROMESSAGE_TOKEN is missing in environment configuration.",
      rawPayload: {},
    };
  }

  let callbackUrl: string | undefined = undefined;
  if (callbackToken && callbackBase) {
    callbackUrl = `${callbackBase.replace(/\/$/, "")}/api/webhook/afromessage/callback?token=${encodeURIComponent(
      callbackToken
    )}`;
  }

  const payload: Record<string, unknown> = {
    to: recipient,
    message,
  };

  if (identifierId) payload.from = identifierId;
  if (senderName) payload.sender = senderName;
  if (callbackUrl) payload.callback = callbackUrl;

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/send`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (res.ok && (data.acknowledge === "success" || data.status === "success")) {
      const msgId = data.response?.id || data.id || `afro_${Date.now()}`;
      return {
        successful: true,
        gatewayMessageId: String(msgId),
        status: "submitted",
        rawPayload: data,
      };
    }

    const err = data.message || data.error || `HTTP ${res.status}`;
    return {
      successful: false,
      gatewayMessageId: "",
      status: "failed",
      errorMessage: err,
      rawPayload: data,
    };
  } catch (error) {
    const errMessage = error instanceof Error ? error.message : "Unknown gateway connection error";
    return {
      successful: false,
      gatewayMessageId: "",
      status: "failed",
      errorMessage: errMessage,
      rawPayload: { exception: errMessage },
    };
  }
}
