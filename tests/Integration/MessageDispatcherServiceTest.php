<?php

declare(strict_types=1);

namespace App\Tests\Integration;

use App\Entity\Appointment;
use App\Entity\Facility;
use App\Entity\MessageTemplate;
use App\Entity\OutboxMessage;
use App\Entity\Participant;
use App\Entity\ParticipantPhone;
use App\Entity\Pregnancy;
use App\Entity\TemplateVariant;
use App\Service\Clinical\GestationalAgeCalculator;
use App\Service\Scheduler\MessageDispatcherService;
use App\Service\Sms\FakeGateway;
use App\Service\Sms\Ucs2SegmentCalculator;
use DateTimeImmutable;
use Symfony\Bundle\FrameworkBundle\Test\KernelTestCase;

class MessageDispatcherServiceTest extends KernelTestCase
{
    private MessageDispatcherService $dispatcher;
    private $em;

    protected function setUp(): void
    {
        self::bootKernel();
        $this->em = static::getContainer()->get('doctrine.orm.entity_manager');
        $this->dispatcher = static::getContainer()->get(MessageDispatcherService::class);
    }

    public function testSchedulerIsIdempotent(): void
    {
        // First run
        $res1 = $this->dispatcher->planSchedules();

        // Second run immediately after
        $res2 = $this->dispatcher->planSchedules();

        // Second run must NOT queue any duplicates
        $this->assertSame(0, $res2['educational_queued'], 'Second scheduler run must queue 0 duplicate educational messages.');
        $this->assertSame(0, $res2['reminders_queued'], 'Second scheduler run must queue 0 duplicate appointment reminders.');
    }

    public function testOptOutCancelsPendingMessages(): void
    {
        $participant = $this->em->getRepository(Participant::class)->findOneBy([
            'status' => Participant::STATUS_ACTIVE_PREGNANT,
        ]);

        $this->assertNotNull($participant);

        $this->dispatcher->processOptOut($participant, 'test', 'Testing opt-out');

        $this->assertSame(Participant::STATUS_OPTED_OUT, $participant->getStatus());

        // Verify pending messages are marked cancelled
        $pending = $this->em->getRepository(OutboxMessage::class)->findBy([
            'participant' => $participant,
            'status' => [OutboxMessage::STATUS_PENDING, OutboxMessage::STATUS_QUEUED],
        ]);

        $this->assertCount(0, $pending);
    }
}
