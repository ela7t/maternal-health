<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Appointment;
use App\Entity\Facility;
use App\Entity\OutboxMessage;
use App\Entity\Participant;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class DashboardController extends AbstractController
{
    #[Route('/', name: 'app_dashboard')]
    public function index(EntityManagerInterface $em): Response
    {
        $participantRepo = $em->getRepository(Participant::class);
        $appointmentRepo = $em->getRepository(Appointment::class);
        $outboxRepo = $em->getRepository(OutboxMessage::class);

        // Summary counts
        $totalEnrolled = $participantRepo->count([]);
        $activePregnant = $participantRepo->count(['status' => Participant::STATUS_ACTIVE_PREGNANT]);
        $activePostnatal = $participantRepo->count(['status' => Participant::STATUS_POSTNATAL]);
        $completed = $participantRepo->count(['status' => Participant::STATUS_COMPLETED]);
        $optedOut = $participantRepo->count(['status' => Participant::STATUS_OPTED_OUT]);
        $lossCount = $participantRepo->count(['status' => Participant::STATUS_LOSS]);

        $missedAppointments = $appointmentRepo->count(['status' => Appointment::STATUS_MISSED]);
        $scheduledAppointments = $appointmentRepo->count(['status' => Appointment::STATUS_SCHEDULED]);

        $totalSms = $outboxRepo->count([]);
        $sentSms = $outboxRepo->count(['status' => OutboxMessage::STATUS_SUBMITTED]) + $outboxRepo->count(['status' => OutboxMessage::STATUS_SENT]) + $outboxRepo->count(['status' => OutboxMessage::STATUS_DELIVERED]);
        $failedSms = $outboxRepo->count(['status' => OutboxMessage::STATUS_FAILED]);

        $deliverySuccessRate = $totalSms > 0 ? round(($sentSms / $totalSms) * 100, 1) : 100.0;

        // Recent outbox messages
        $recentMessages = $outboxRepo->findBy([], ['id' => 'DESC'], 10);

        // Facilities
        $facilities = $em->getRepository(Facility::class)->findAll();

        return $this->render('dashboard/index.html.twig', [
            'totalEnrolled' => $totalEnrolled,
            'activePregnant' => $activePregnant,
            'activePostnatal' => $activePostnatal,
            'completed' => $completed,
            'optedOut' => $optedOut,
            'lossCount' => $lossCount,
            'missedAppointments' => $missedAppointments,
            'scheduledAppointments' => $scheduledAppointments,
            'totalSms' => $totalSms,
            'sentSms' => $sentSms,
            'failedSms' => $failedSms,
            'deliverySuccessRate' => $deliverySuccessRate,
            'recentMessages' => $recentMessages,
            'facilities' => $facilities,
        ]);
    }
}
