<?php

declare(strict_types=1);

namespace App\Service\Sms;

/**
 * Value object representing the result of an SMS send attempt.
 */
readonly class SmsSendResult
{
    public function __construct(
        public bool $successful,
        public string $gatewayMessageId,
        public string $status, // queued, submitted, sent, delivered, failed
        public ?string $errorMessage = null,
        public array $rawPayload = []
    ) {
    }

    public static function success(string $gatewayMessageId, string $status = 'submitted', array $rawPayload = []): self
    {
        return new self(
            successful: true,
            gatewayMessageId: $gatewayMessageId,
            status: $status,
            rawPayload: $rawPayload
        );
    }

    public static function failure(string $errorMessage, array $rawPayload = []): self
    {
        return new self(
            successful: false,
            gatewayMessageId: '',
            status: 'failed',
            errorMessage: $errorMessage,
            rawPayload: $rawPayload
        );
    }
}
