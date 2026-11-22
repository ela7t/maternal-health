<?php

declare(strict_types=1);

namespace App\Service\Scheduler;

use App\Entity\Appointment;
use App\Entity\AuditLog;
use App\Entity\DeliveryEvent;
use App\Entity\MessageTemplate;
use App\Entity\OptOut;
use App\Entity\OutboxMessage;
use App\Entity\Participant;
use App\Entity\Pregnancy;
use App\Entity\TemplateVariant;
use App\Service\Clinical\GestationalAgeCalculator;
use App\Service\Sms\SmsGatewayInterface;
use App\Service\Sms\Ucs2SegmentCalculator;
use DateTimeImmutable;
use DateTimeZone;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;

class MessageDispatcherService
{
    private DateTimeZone $ethiopiaTz;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly GestationalAgeCalculator $gaCalculator,
        private readonly SmsGatewayInterface $smsGateway,
        private readonly Ucs2SegmentCalculator $segmentCalculator,
        private readonly ?LoggerInterface $logger = null
    ) {
        $this->ethiopiaTz = new DateTimeZone('Africa/Addis_Ababa');
    }

    /**
     * Evaluates all active participants, appointments, and schedules appropriate educational
     * and reminder messages into the outbox.
     *
     * @return array{educational_queued: int, reminders_queued: int, overdue_flagged: int, missed_flagged: int}
     */
    public function planSchedules(?DateTimeImmutable $asOf = null): array
    {
        $now = ($asOf ?? new DateTimeImmutable('now'))->setTimezone($this->ethiopiaTz);
        $educationalQueued = 0;
        $remindersQueued = 0;
        $overdueFlagged = 0;
        $missedFlagged = 0;

        // 1. Process Pregnant Participants
        $pregnantParticipants = $this->em->getRepository(Participant::class)->findBy([
            'status' => Participant::STATUS_ACTIVE_PREGNANT,
        ]);

        foreach ($pregnantParticipants as $participant) {
            $pregnancy = $participant->getCurrentPregnancy();
            if (!$pregnancy || !$pregnancy->getEddDate()) {
                continue;
            }

            // Check overdue (> EDD + 14 days)
            if ($this->gaCalculator->isOverdue($pregnancy->getEddDate(), $now)) {
                $this->logger?->warning(sprintf('Participant %s is overdue (>14 days past EDD). Pausing SMS.', $participant->getPublicCode()));
                $overdueFlagged++;
                continue;
            }

            $ga = $this->gaCalculator->calculateGestationalAge($pregnancy->getEddDate(), $now);
            $currentWeek = $ga['weeks'];

            // Find educational templates for this GA week
            $templates = $this->em->createQueryBuilder()
                ->select('t')
                ->from(MessageTemplate::class, 't')
                ->where('t.stream = :stream')
                ->andWhere('t.approvalStatus = :status')
                ->andWhere(':gaWeek >= t.gaFromWeeks AND :gaWeek <= t.gaToWeeks')
                ->setParameter('stream', MessageTemplate::STREAM_EDUCATIONAL)
                ->setParameter('status', MessageTemplate::STATUS_APPROVED)
                ->setParameter('gaWeek', $currentWeek)
                ->getQuery()
                ->getResult();

            foreach ($templates as $template) {
                // Risk filter check
                if ($template->getRiskFilter() !== null && $template->getRiskFilter() !== $pregnancy->getRiskStatus()) {
                    continue;
                }

                $idempotencyKey = sprintf('MOM_%d_GA_W%d_%s', $participant->getId(), $currentWeek, $template->getCode());
                if ($this->isAlreadyScheduled($idempotencyKey)) {
                    continue;
                }

                $variant = $this->selectVariant($template, $participant);
                if (!$variant) {
                    continue;
                }

                $scheduledTime = $this->calculateNextSendWindow($now);
                $this->createOutboxMessage($participant, $variant, $variant->getBody(), $idempotencyKey, $scheduledTime);
                $educationalQueued++;
            }
        }

        // 2. Process Postnatal Participants
        $postnatalParticipants = $this->em->getRepository(Participant::class)->findBy([
            'status' => Participant::STATUS_POSTNATAL,
        ]);

        foreach ($postnatalParticipants as $participant) {
            $pregnancy = $participant->getCurrentPregnancy();
            if (!$pregnancy || !$pregnancy->getDeliveredAt()) {
                continue;
            }

            $postnatalAge = $this->gaCalculator->calculatePostnatalAge($pregnancy->getDeliveredAt(), $now);
            if ($postnatalAge['is_completed']) {
                $participant->setStatus(Participant::STATUS_COMPLETED);
                continue;
            }

            $currentDay = $postnatalAge['days'];
            $pncTemplates = $this->em->createQueryBuilder()
                ->select('t')
                ->from(MessageTemplate::class, 't')
                ->where('t.stream = :stream')
                ->andWhere('t.approvalStatus = :status')
                ->andWhere(':pncDay >= t.pncDayFrom AND :pncDay <= t.pncDayTo')
                ->setParameter('stream', MessageTemplate::STREAM_EDUCATIONAL)
                ->setParameter('status', MessageTemplate::STATUS_APPROVED)
                ->setParameter('pncDay', $currentDay)
                ->getQuery()
                ->getResult();

            foreach ($pncTemplates as $template) {
                $idempotencyKey = sprintf('MOM_%d_PNC_D%d_%s', $participant->getId(), $currentDay, $template->getCode());
                if ($this->isAlreadyScheduled($idempotencyKey)) {
                    continue;
                }

                $variant = $this->selectVariant($template, $participant);
                if (!$variant) {
                    continue;
                }

                $scheduledTime = $this->calculateNextSendWindow($now);
                $this->createOutboxMessage($participant, $variant, $variant->getBody(), $idempotencyKey, $scheduledTime);
                $educationalQueued++;
            }
        }

        // 3. Process ANC/PNC Appointment Reminders (72 hours before visit)
        $reminderWindowStart = $now;
        $reminderWindowEnd = $now->modify('+72 hours');

        $appointments = $this->em->createQueryBuilder()
            ->select('a')
            ->from(Appointment::class, 'a')
            ->join('a.participant', 'p')
            ->where('a.status = :status')
            ->andWhere('a.scheduledFor >= :start AND a.scheduledFor <= :end')
            ->andWhere('p.status IN (:activeStatuses)')
            ->setParameter('status', Appointment::STATUS_SCHEDULED)
            ->setParameter('start', $reminderWindowStart)
            ->setParameter('end', $reminderWindowEnd)
            ->setParameter('activeStatuses', [Participant::STATUS_ACTIVE_PREGNANT, Participant::STATUS_POSTNATAL])
            ->getQuery()
            ->getResult();

        foreach ($appointments as $appointment) {
            $participant = $appointment->getParticipant();
            $idempotencyKey = sprintf('MOM_%d_REMIND_APT_%d_72H', $participant->getId(), $appointment->getId());

            if ($this->isAlreadyScheduled($idempotencyKey)) {
                continue;
            }

            // Find reminder template
            $stream = ($appointment->getKind() === Appointment::KIND_PNC)
                ? MessageTemplate::STREAM_PNC_REMINDER
                : MessageTemplate::STREAM_ANC_REMINDER;

            $template = $this->em->getRepository(MessageTemplate::class)->findOneBy([
                'stream' => $stream,
                'approvalStatus' => MessageTemplate::STATUS_APPROVED,
            ]);

            $body = $template ? $this->selectVariant($template, $participant)?->getBody() : null;
            if (!$body) {
                // Default localized reminder text if template not in database
                $body = sprintf(
                    'ማስታወሻ፡ የጤና ቀጠሮዎ በቅርቡ ነው። እባክዎ በቀጠሮዎ ቀን ወደ %s ጤና ጣቢያ ይምጡ።',
                    $participant->getFacility()?->getName() ?? 'አቅራቢያዎ ወደሚገኘው'
                );
            }

            $variant = $template ? $this->selectVariant($template, $participant) : null;
            $sendTime = $this->calculateNextSendWindow($now);
            $this->createOutboxMessage($participant, $variant, $body, $idempotencyKey, $sendTime);
            $remindersQueued++;
        }

        // 4. Detect Missed Appointments & Schedule Rescheduling Reminder
        $missedCutoff = $now->modify('-24 hours');
        $pastScheduled = $this->em->createQueryBuilder()
            ->select('a')
            ->from(Appointment::class, 'a')
            ->join('a.participant', 'p')
            ->where('a.status = :status')
            ->andWhere('a.scheduledFor < :cutoff')
            ->andWhere('p.status IN (:activeStatuses)')
            ->setParameter('status', Appointment::STATUS_SCHEDULED)
            ->setParameter('cutoff', $missedCutoff)
            ->setParameter('activeStatuses', [Participant::STATUS_ACTIVE_PREGNANT, Participant::STATUS_POSTNATAL])
            ->getQuery()
            ->getResult();

        foreach ($pastScheduled as $missedApt) {
            $missedApt->setStatus(Appointment::STATUS_MISSED);
            $participant = $missedApt->getParticipant();
            $missedFlagged++;

            $rescheduleKey = sprintf('MOM_%d_RESCHEDULE_APT_%d', $participant->getId(), $missedApt->getId());
            if (!$this->isAlreadyScheduled($rescheduleKey)) {
                $rescheduleTemplate = $this->em->getRepository(MessageTemplate::class)->findOneBy([
                    'stream' => MessageTemplate::STREAM_RESCHEDULE,
                    'approvalStatus' => MessageTemplate::STATUS_APPROVED,
                ]);

                $rescheduleBody = $rescheduleTemplate ? $this->selectVariant($rescheduleTemplate, $participant)?->getBody() : null;
                if (!$rescheduleBody) {
                    $rescheduleBody = sprintf(
                        'ያለፈውን የጤና ቀጠሮዎን አላገኙም። እባክዎ አዲስ የቀጠሮ ቀን ለማስያዝ ወደ %s ጤና ጣቢያ በአስቸኳይ ይምጡ።',
                        $participant->getFacility()?->getName() ?? 'ጤና ጣቢያ'
                    );
                }

                $rescheduleVariant = $rescheduleTemplate ? $this->selectVariant($rescheduleTemplate, $participant) : null;
                $this->createOutboxMessage($participant, $rescheduleVariant, $rescheduleBody, $rescheduleKey, $this->calculateNextSendWindow($now));
            }
        }

        $this->em->flush();

        return [
            'educational_queued' => $educationalQueued,
            'reminders_queued' => $remindersQueued,
            'overdue_flagged' => $overdueFlagged,
            'missed_flagged' => $missedFlagged,
        ];
    }

    /**
     * Dispatches queued messages whose scheduled time has arrived.
     *
     * @return array{sent: int, failed: int, retried: int}
     */
    public function dispatchPendingMessages(?DateTimeImmutable $asOf = null): array
    {
        $now = ($asOf ?? new DateTimeImmutable('now'))->setTimezone($this->ethiopiaTz);

        $pendingMessages = $this->em->createQueryBuilder()
            ->select('o')
            ->from(OutboxMessage::class, 'o')
            ->where('o.status IN (:statuses)')
            ->andWhere('o.scheduledAt <= :now')
            ->setParameter('statuses', [OutboxMessage::STATUS_PENDING, OutboxMessage::STATUS_QUEUED])
            ->setParameter('now', $now)
            ->setMaxResults(50)
            ->getQuery()
            ->getResult();

        $sentCount = 0;
        $failedCount = 0;
        $retriedCount = 0;

        foreach ($pendingMessages as $outbox) {
            $participant = $outbox->getParticipant();

            // Guard against opt-out or loss
            if ($participant->getStatus() === Participant::STATUS_OPTED_OUT || $participant->getStatus() === Participant::STATUS_LOSS) {
                $outbox->setStatus(OutboxMessage::STATUS_CANCELLED);
                $outbox->setFailureReason('Participant is opted-out or had pregnancy loss.');
                continue;
            }

            $phone = $outbox->getPhone();
            if (!$phone || empty($phone->getNumberE164())) {
                $outbox->setStatus(OutboxMessage::STATUS_FAILED);
                $outbox->setFailureReason('No valid E.164 phone number available.');
                $failedCount++;
                continue;
            }

            $outbox->incrementAttempts();
            $result = $this->smsGateway->send(
                $phone->getNumberE164(),
                $outbox->getMessageContent() ?? '',
                $outbox->getCallbackToken()
            );

            // Record Delivery Event
            $event = new DeliveryEvent();
            $event->setOutbox($outbox);
            $event->setRawStatus($result->status);
            $event->setMappedStatus($result->status);
            $event->setRawPayload($result->rawPayload);
            $this->em->persist($event);

            if ($result->successful) {
                $outbox->setStatus(OutboxMessage::STATUS_SUBMITTED);
                $outbox->setGatewayMessageId($result->gatewayMessageId);
                $outbox->setSentAt(new DateTimeImmutable('now'));
                $sentCount++;
            } else {
                $phone->incrementFailureCount();
                $outbox->setFailureReason($result->errorMessage);

                if ($outbox->getAttempts() < 3) {
                    // Retry with exponential delay (15 min, 45 min)
                    $retryDelay = $outbox->getAttempts() * 15;
                    $outbox->setScheduledAt($now->modify("+{$retryDelay} minutes"));
                    $outbox->setStatus(OutboxMessage::STATUS_QUEUED);
                    $retriedCount++;
                } else {
                    $outbox->setStatus(OutboxMessage::STATUS_FAILED);
                    $failedCount++;
                }
            }
        }

        $this->em->flush();

        return [
            'sent' => $sentCount,
            'failed' => $failedCount,
            'retried' => $retriedCount,
        ];
    }

    /**
     * Halts all scheduled messages immediately when a participant opts out.
     */
    public function processOptOut(Participant $participant, string $source = OptOut::SOURCE_SMS_REPLY, ?string $reason = null): void
    {
        $participant->setStatus(Participant::STATUS_OPTED_OUT);

        $optOut = new OptOut();
        $optOut->setParticipant($participant);
        $optOut->setSource($source);
        $optOut->setReason($reason);
        $this->em->persist($optOut);

        // Cancel all pending messages
        $this->em->createQueryBuilder()
            ->update(OutboxMessage::class, 'o')
            ->set('o.status', ':cancelled')
            ->set('o.failureReason', ':reason')
            ->where('o.participant = :participant')
            ->andWhere('o.status IN (:pendingStatuses)')
            ->setParameter('cancelled', OutboxMessage::STATUS_CANCELLED)
            ->setParameter('reason', 'Cancelled due to Opt-Out')
            ->setParameter('participant', $participant)
            ->setParameter('pendingStatuses', [OutboxMessage::STATUS_PENDING, OutboxMessage::STATUS_QUEUED])
            ->getQuery()
            ->execute();

        $this->em->flush();
    }

    /**
     * Sensitive branch: Halts all baby/pregnancy messages on miscarriage, stillbirth, or neonatal loss.
     */
    public function processPregnancyLoss(Participant $participant, string $lossOutcome): void
    {
        $participant->setStatus(Participant::STATUS_LOSS);

        $pregnancy = $participant->getCurrentPregnancy();
        if ($pregnancy) {
            $pregnancy->setOutcome($lossOutcome);
        }

        // Cancel all active and pending messages immediately
        $this->em->createQueryBuilder()
            ->update(OutboxMessage::class, 'o')
            ->set('o.status', ':cancelled')
            ->set('o.failureReason', ':reason')
            ->where('o.participant = :participant')
            ->andWhere('o.status IN (:pendingStatuses)')
            ->setParameter('cancelled', OutboxMessage::STATUS_CANCELLED)
            ->setParameter('reason', 'Cancelled due to pregnancy loss / neonatal mortality')
            ->setParameter('participant', $participant)
            ->setParameter('pendingStatuses', [OutboxMessage::STATUS_PENDING, OutboxMessage::STATUS_QUEUED])
            ->getQuery()
            ->execute();

        // Audit Log
        $audit = new AuditLog();
        $audit->setAction('pregnancy_loss');
        $audit->setEntityClass(Participant::class);
        $audit->setEntityId((string) $participant->getId());
        $audit->setDetails(['outcome' => $lossOutcome, 'public_code' => $participant->getPublicCode()]);
        $this->em->persist($audit);

        $this->em->flush();
    }

    private function isAlreadyScheduled(string $idempotencyKey): bool
    {
        $existing = $this->em->getRepository(OutboxMessage::class)->findOneBy([
            'idempotencyKey' => $idempotencyKey,
        ]);

        return $existing !== null;
    }

    private function selectVariant(MessageTemplate $template, Participant $participant): ?TemplateVariant
    {
        $lang = $participant->getPreferredLanguage() ?: 'am';
        $framing = TemplateVariant::FRAMING_GAIN;

        if ($participant->getStudyArm() === 'intervention_loss') {
            $framing = TemplateVariant::FRAMING_LOSS;
        }

        return $template->getVariant($lang, $framing);
    }

    private function calculateNextSendWindow(DateTimeImmutable $now): DateTimeImmutable
    {
        $hour = (int) $now->format('G');

        // Preferred send windows in Addis Ababa:
        // Window 1: 08:00 - 10:00 AM
        // Window 2: 19:00 (7:00 PM)
        if ($hour < 8) {
            return $now->setTime(8, 0, 0);
        }

        if ($hour >= 8 && $hour < 10) {
            return $now; // Current window is active
        }

        if ($hour < 19) {
            return $now->setTime(19, 0, 0);
        }

        // After 19:00, schedule for next morning at 8:00 AM
        return $now->modify('+1 day')->setTime(8, 0, 0);
    }

    private function createOutboxMessage(
        Participant $participant,
        ?TemplateVariant $variant,
        string $content,
        string $idempotencyKey,
        DateTimeImmutable $scheduledAt
    ): OutboxMessage {
        $phone = $participant->getPrimaryPhone();
        if (!$phone) {
            throw new \RuntimeException('Participant has no phone number: ' . $participant->getPublicCode());
        }

        $segmentInfo = $this->segmentCalculator->calculate($content);

        $outbox = new OutboxMessage();
        $outbox->setParticipant($participant);
        $outbox->setPhone($phone);
        $outbox->setVariant($variant);
        $outbox->setMessageContent($content);
        $outbox->setIdempotencyKey($idempotencyKey);
        $outbox->setScheduledAt($scheduledAt);
        $outbox->setWindowEnd($scheduledAt->modify('+2 hours'));
        $outbox->setSegments($segmentInfo['segment_count']);
        $outbox->setStatus(OutboxMessage::STATUS_PENDING);

        $this->em->persist($outbox);
        return $outbox;
    }
}
