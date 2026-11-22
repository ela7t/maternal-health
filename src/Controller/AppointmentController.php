<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Appointment;
use DateTimeImmutable;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/appointments')]
class AppointmentController extends AbstractController
{
    #[Route('', name: 'app_appointments_list', methods: ['GET'])]
    public function list(Request $request, EntityManagerInterface $em): Response
    {
        $filter = $request->query->get('filter', 'all');

        $qb = $em->getRepository(Appointment::class)->createQueryBuilder('a')
            ->join('a.participant', 'p')
            ->leftJoin('p.facility', 'f')
            ->addSelect('p', 'f')
            ->orderBy('a.scheduledFor', 'ASC');

        $now = new DateTimeImmutable('now');

        if ($filter === 'missed') {
            $qb->andWhere('a.status = :status')->setParameter('status', Appointment::STATUS_MISSED);
        } elseif ($filter === 'scheduled') {
            $qb->andWhere('a.status = :status')->setParameter('status', Appointment::STATUS_SCHEDULED);
        } elseif ($filter === 'today') {
            $startOfDay = $now->setTime(0, 0, 0);
            $endOfDay = $now->setTime(23, 59, 59);
            $qb->andWhere('a.scheduledFor >= :start AND a.scheduledFor <= :end')
                ->setParameter('start', $startOfDay)
                ->setParameter('end', $endOfDay);
        }

        $appointments = $qb->getQuery()->getResult();

        return $this->render('appointment/list.html.twig', [
            'appointments' => $appointments,
            'currentFilter' => $filter,
        ]);
    }

    #[Route('/{id}/attend', name: 'app_appointment_attend', methods: ['POST'])]
    public function attend(int $id, EntityManagerInterface $em): Response
    {
        $apt = $em->getRepository(Appointment::class)->find($id);
        if (!$apt) {
            throw $this->createNotFoundException();
        }

        $apt->setStatus(Appointment::STATUS_ATTENDED);
        $em->flush();

        $this->addFlash('success', 'Appointment marked as Attended.');
        return $this->redirectToRoute('app_appointments_list');
    }

    #[Route('/{id}/reschedule', name: 'app_appointment_reschedule', methods: ['POST'])]
    public function reschedule(int $id, Request $request, EntityManagerInterface $em): Response
    {
        $apt = $em->getRepository(Appointment::class)->find($id);
        if (!$apt) {
            throw $this->createNotFoundException();
        }

        $newDateStr = (string) $request->request->get('new_date');
        if (empty($newDateStr)) {
            $this->addFlash('error', 'New date is required.');
            return $this->redirectToRoute('app_appointments_list');
        }

        $newDate = new DateTimeImmutable($newDateStr);

        $apt->setStatus(Appointment::STATUS_RESCHEDULED);

        $newApt = new Appointment();
        $newApt->setParticipant($apt->getParticipant());
        $newApt->setKind($apt->getKind());
        $newApt->setScheduledFor($newDate);
        $newApt->setStatus(Appointment::STATUS_SCHEDULED);
        $newApt->setRescheduledFrom($apt);
        $newApt->setRecordedBy('Midwife Rescheduling');
        $em->persist($newApt);

        $em->flush();

        $this->addFlash('success', sprintf('Appointment rescheduled for %s. New 72-hour reminder queued.', $newDate->format('Y-m-d H:i')));
        return $this->redirectToRoute('app_appointments_list');
    }
}
