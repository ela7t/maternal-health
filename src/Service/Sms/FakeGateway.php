<?php

declare(strict_types=1);

namespace App\Service\Sms;

use Psr\Log\LoggerInterface;

/**
 * Fake gateway for local development, staging, and automated testing.
 * Simulates AfroMessage responses without sending actual SMS messages.
 */
class FakeGateway implements SmsGatewayInterface
{
    private array $sentMessages = [];

    public function __construct(
        private readonly ?LoggerInterface $logger = null
    ) {
    }

    public function send(string $toE164, string $messageBody, ?string $callbackToken = null): SmsSendResult
    {
        $gatewayId = 'fake_msg_' . bin2hex(random_bytes(8));

        // Simulate invalid number failure if number contains "000000"
        if (str_contains($toE164, '000000')) {
            $this->logger?->warning(sprintf('[FakeGateway] Simulated failure for invalid number: %s', $toE164));
            return SmsSendResult::failure('Simulated gateway failure: Invalid recipient number', [
                'provider' => 'fake',
                'recipient' => $toE164,
                'error' => 'INVALID_NUMBER'
            ]);
        }

        $result = [
            'provider' => 'fake',
            'id' => $gatewayId,
            'to' => $toE164,
            'body' => $messageBody,
            'token' => $callbackToken,
            'time' => date('c'),
            'status' => 'submitted',
        ];

        $this->sentMessages[] = $result;
        $this->logger?->info(sprintf('[FakeGateway] Simulated SMS sent to %s (ID: %s)', $toE164, $gatewayId));

        return SmsSendResult::success($gatewayId, 'submitted', $result);
    }

    public function getSentMessages(): array
    {
        return $this->sentMessages;
    }

    public function clearSentMessages(): void
    {
        $this->sentMessages = [];
    }

    public function getName(): string
    {
        return 'FakeGateway';
    }
}
