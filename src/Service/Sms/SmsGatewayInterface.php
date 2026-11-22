<?php

declare(strict_types=1);

namespace App\Service\Sms;

/**
 * Common interface for all SMS sending adapters (AfroMessage, FakeGateway, etc.).
 */
interface SmsGatewayInterface
{
    /**
     * Sends an SMS message to an E.164 formatted Ethiopian number.
     *
     * @param string $toE164 Target phone number (e.g., "+251911234567")
     * @param string $messageBody Content of the message
     * @param string|null $callbackToken Unique per-message token for verifying status callbacks
     */
    public function send(string $toE164, string $messageBody, ?string $callbackToken = null): SmsSendResult;

    /**
     * Returns the name of the gateway provider.
     */
    public function getName(): string;
}
