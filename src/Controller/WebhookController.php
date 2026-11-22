<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\DeliveryEvent;
use App\Entity\OptOut;
use App\Entity\OutboxMessage;
use App\Entity\ParticipantPhone;
use App\Service\Scheduler\MessageDispatcherService;
use DateTimeImmutable;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api/webhook/afromessage')]
class WebhookController extends AbstractController
{
    /**
     * Handles AfroMessage delivery status callbacks (GET endpoint as specified in SDK contract).
     */
    #[Route('/callback', name: 'app_webhook_afromessage_callback', methods: ['GET'])]
    public function callback(Request $request, EntityManagerInterface $em): JsonResponse
    {
        $token = $request->query->get('token');
        $rawStatus = (string) $request->query->get('status', 'unknown');

        if (!$token) {
            return $this->json(['error' => 'Missing callback token'], 400);
        }

        $outbox = $em->getRepository(OutboxMessage::class)->findOneBy(['callbackToken' => $token]);
        if (!$outbox) {
            return $this->json(['error' => 'Invalid or unknown token'], 404);
        }

        // Map status
        $mappedStatus = match (strtolower($rawStatus)) {
            'delivered', 'success' => OutboxMessage::STATUS_DELIVERED,
            'failed', 'rejected', 'undelivered' => OutboxMessage::STATUS_FAILED,
            'sent' => OutboxMessage::STATUS_SENT,
            default => OutboxMessage::STATUS_SUBMITTED,
        };

        $outbox->setStatus($mappedStatus);
        if ($mappedStatus === OutboxMessage::STATUS_DELIVERED) {
            $outbox->setDeliveredAt(new DateTimeImmutable('now'));
        }

        // Persist delivery event
        $event = new DeliveryEvent();
        $event->setOutbox($outbox);
        $event->setRawStatus($rawStatus);
        $event->setMappedStatus($mappedStatus);
        $event->setRawPayload($request->query->all());
        $em->persist($event);

        $em->flush();

        return $this->json(['status' => 'acknowledged', 'message_id' => $outbox->getId()]);
    }

    /**
     * Handles inbound SMS replies (e.g., "STOP" or "አቁም" opt-out requests).
     */
    #[Route('/inbound', name: 'app_webhook_afromessage_inbound', methods: ['POST', 'GET'])]
    public function inbound(
        Request $request,
        EntityManagerInterface $em,
        MessageDispatcherService $dispatcher
    ): JsonResponse {
        $from = (string) ($request->get('from') ?? $request->get('sender') ?? '');
        $body = trim((string) ($request->get('message') ?? $request->get('text') ?? ''));

        if (empty($from)) {
            return $this->json(['error' => 'Sender number required'], 400);
        }

        $normalizedFrom = trim($from);
        $phoneHash = hash('sha256', $normalizedFrom);

        $phoneRecord = $em->getRepository(ParticipantPhone::class)->findOneBy(['phoneHash' => $phoneHash]);
        if (!$phoneRecord) {
            // Also try with/without leading + or 0
            $altNumber = str_starts_with($normalizedFrom, '+') ? substr($normalizedFrom, 1) : ('+' . $normalizedFrom);
            $phoneRecord = $em->getRepository(ParticipantPhone::class)->findOneBy(['phoneHash' => hash('sha256', $altNumber)]);
        }

        $upperBody = mb_strtoupper($body, 'UTF-8');
        $isStop = str_contains($upperBody, 'STOP') || str_contains($upperBody, 'አቁም');

        if ($isStop && $phoneRecord) {
            $participant = $phoneRecord->getParticipant();
            $dispatcher->processOptOut($participant, OptOut::SOURCE_SMS_REPLY, 'Mother replied STOP/አቁም via SMS');
            return $this->json(['status' => 'opted_out', 'participant' => $participant->getPublicCode()]);
        }

        return $this->json(['status' => 'received', 'acknowledged' => true]);
    }
}
