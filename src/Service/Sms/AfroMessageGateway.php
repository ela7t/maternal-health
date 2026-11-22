<?php

declare(strict_types=1);

namespace App\Service\Sms;

use Psr\Log\LoggerInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;
use Throwable;

/**
 * AfroMessage SMS Gateway implementation for Ethiopian telecom routing (Ethio Telecom & Safaricom).
 */
class AfroMessageGateway implements SmsGatewayInterface
{
    public function __construct(
        private readonly HttpClientInterface $httpClient,
        private readonly string $baseUrl,
        private readonly string $token,
        private readonly string $identifierId,
        private readonly string $senderName,
        private readonly string $callbackBaseUrl,
        private readonly bool $isLive = false,
        private readonly ?FakeGateway $fakeFallback = null,
        private readonly ?LoggerInterface $logger = null
    ) {
    }

    public function send(string $toE164, string $messageBody, ?string $callbackToken = null): SmsSendResult
    {
        // Safety guard: If not live mode, never call external telecom API
        if (!$this->isLive) {
            $this->logger?->info('[AfroMessageGateway] SMS_LIVE=0: routing through FakeGateway fallback');
            if ($this->fakeFallback !== null) {
                return $this->fakeFallback->send($toE164, $messageBody, $callbackToken);
            }
            return SmsSendResult::success('mock_live_disabled_' . uniqid(), 'submitted', ['mode' => 'sandbox']);
        }

        $callbackUrl = null;
        if ($callbackToken !== null && !empty($this->callbackBaseUrl)) {
            $callbackUrl = rtrim($this->callbackBaseUrl, '/') . '/api/webhook/afromessage/callback?token=' . urlencode($callbackToken);
        }

        $endpoint = rtrim($this->baseUrl, '/') . '/send';

        $payload = [
            'to' => $toE164,
            'message' => $messageBody,
        ];

        if (!empty($this->identifierId)) {
            $payload['from'] = $this->identifierId;
        }

        if (!empty($this->senderName)) {
            $payload['sender'] = $this->senderName;
        }

        if ($callbackUrl !== null) {
            $payload['callback'] = $callbackUrl;
        }

        try {
            $response = $this->httpClient->request('POST', $endpoint, [
                'headers' => [
                    'Authorization' => 'Bearer ' . $this->token,
                    'Accept' => 'application/json',
                    'Content-Type' => 'application/json',
                ],
                'json' => $payload,
                'timeout' => 10.0,
            ]);

            $statusCode = $response->getStatusCode();
            $data = $response->toArray(false);

            if ($statusCode >= 200 && $statusCode < 300 && ($data['acknowledge'] ?? '') === 'success') {
                $gatewayId = (string) ($data['response']['id'] ?? $data['id'] ?? uniqid('afro_'));
                return SmsSendResult::success($gatewayId, 'submitted', $data);
            }

            $errorMsg = $data['message'] ?? $data['error'] ?? ('HTTP status ' . $statusCode);
            $this->logger?->error(sprintf('[AfroMessageGateway] Delivery failed for %s: %s', $toE164, $errorMsg));

            return SmsSendResult::failure('AfroMessage error: ' . $errorMsg, $data);
        } catch (Throwable $e) {
            $this->logger?->error(sprintf('[AfroMessageGateway] Exception during send to %s: %s', $toE164, $e->getMessage()));
            return SmsSendResult::failure('Gateway connection error: ' . $e->getMessage(), ['exception' => $e->getMessage()]);
        }
    }

    public function getName(): string
    {
        return 'AfroMessage';
    }
}
