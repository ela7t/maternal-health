<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\Appointment;
use App\Entity\Baby;
use App\Entity\Facility;
use App\Entity\OutboxMessage;
use App\Entity\Participant;
use App\Entity\ParticipantPhone;
use App\Entity\Pregnancy;
use App\Service\Calendar\EthiopianCalendarService;
use App\Service\Clinical\GestationalAgeCalculator;
use App\Service\Scheduler\MessageDispatcherService;
use DateTimeImmutable;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/participants')]
class ParticipantController extends AbstractController
{
    #[Route('', name: 'app_participants_list', methods: ['GET'])]
    public function list(Request $request, EntityManagerInterface $em, GestationalAgeCalculator $gaCalculator): Response
    {
        $status = $request->query->get('status');
        $search = $request->query->get('q');

        $qb = $em->getRepository(Participant::class)->createQueryBuilder('p')
            ->leftJoin('p.facility', 'f')
            ->leftJoin('p.phones', 'ph')
            ->addSelect('f', 'ph')
            ->orderBy('p.id', 'DESC');

        if ($status) {
            $qb->andWhere('p.status = :status')->setParameter('status', $status);
        }

        if ($search) {
            $qb->andWhere('p.publicCode LIKE :search OR p.fullName LIKE :search OR ph.numberE164 LIKE :search')
                ->setParameter('search', '%' . $search . '%');
        }

        $participants = $qb->getQuery()->getResult();

        return $this->render('participant/list.html.twig', [
            'participants' => $participants,
            'currentStatus' => $status,
            'searchQuery' => $search,
            'gaCalculator' => $gaCalculator,
        ]);
    }

    #[Route('/new', name: 'app_participant_new', methods: ['GET', 'POST'])]
    public function new(
        Request $request,
        EntityManagerInterface $em,
        EthiopianCalendarService $ethCal,
        GestationalAgeCalculator $gaCalculator
    ): Response {
        $facilities = $em->getRepository(Facility::class)->findAll();

        if ($request->isMethod('POST')) {
            $fullName = (string) $request->request->get('full_name');
            $phoneNum = (string) $request->request->get('phone');
            $phoneOwner = (string) $request->request->get('phone_owner', 'self');
            $kebele = (string) $request->request->get('kebele');
            $facilityId = (int) $request->request->get('facility_id');
            $studyArm = (string) $request->request->get('study_arm', 'intervention_gain');
            $language = (string) $request->request->get('language', 'am');
            $riskStatus = (string) $request->request->get('risk_status', 'low');

            // Calendar choice for LMP: 'gregorian' or 'ethiopian'
            $calType = (string) $request->request->get('calendar_type', 'gregorian');
            if ($calType === 'ethiopian') {
                $ey = (int) $request->request->get('eth_year');
                $emNum = (int) $request->request->get('eth_month');
                $ed = (int) $request->request->get('eth_day');
                $lmpDate = $ethCal->ethiopianToGregorian($ey, $emNum, $ed);
            } else {
                $lmpStr = (string) $request->request->get('lmp_date');
                $lmpDate = new DateTimeImmutable($lmpStr);
            }

            $facility = $em->getRepository(Facility::class)->find($facilityId);
            if (!$facility) {
                $this->addFlash('error', 'Selected facility not found.');
                return $this->redirectToRoute('app_participant_new');
            }

            $participant = new Participant();
            $participant->setFullName($fullName);
            $participant->setKebele($kebele);
            $participant->setFacility($facility);
            $participant->setStudyArm($studyArm);
            $participant->setPreferredLanguage($language);
            $participant->setConsentRecordedBy('Attending Midwife');
            $participant->setStatus(Participant::STATUS_ACTIVE_PREGNANT);

            $phone = new ParticipantPhone();
            $phone->setNumberE164($phoneNum);
            $phone->setOwnerType($phoneOwner);
            $phone->setIsPrimary(true);
            $participant->addPhone($phone);

            $pregnancy = new Pregnancy();
            $pregnancy->setLmpDate($lmpDate);
            $pregnancy->setEddDate($gaCalculator->calculateEddFromLmp($lmpDate));
            $pregnancy->setDatingMethod(Pregnancy::DATING_LMP);
            $pregnancy->setRiskStatus($riskStatus);
            $pregnancy->setParticipant($participant);
            $em->persist($pregnancy);

            // Optional First ANC appointment
            $ancDateStr = (string) $request->request->get('next_anc_date');
            if (!empty($ancDateStr)) {
                $ancApt = new Appointment();
                $ancApt->setParticipant($participant);
                $ancApt->setKind(Appointment::KIND_ANC);
                $ancApt->setScheduledFor(new DateTimeImmutable($ancDateStr));
                $ancApt->setStatus(Appointment::STATUS_SCHEDULED);
                $ancApt->setRecordedBy('Attending Midwife');
                $em->persist($ancApt);
            }

            $em->persist($participant);
            $em->flush();

            $this->addFlash('success', sprintf('Mother successfully enrolled! Code: %s (EDD: %s)', $participant->getPublicCode(), $pregnancy->getEddDate()->format('Y-m-d')));
            return $this->redirectToRoute('app_participant_show', ['id' => $participant->getId()]);
        }

        return $this->render('participant/new.html.twig', [
            'facilities' => $facilities,
            'todayEth' => $ethCal->gregorianToEthiopian(new DateTimeImmutable('today')),
        ]);
    }

    #[Route('/{id}', name: 'app_participant_show', methods: ['GET'])]
    public function show(
        int $id,
        EntityManagerInterface $em,
        GestationalAgeCalculator $gaCalculator,
        EthiopianCalendarService $ethCal
    ): Response {
        $participant = $em->getRepository(Participant::class)->find($id);
        if (!$participant) {
            throw $this->createNotFoundException('Participant not found.');
        }

        $pregnancy = $participant->getCurrentPregnancy();
        $gaInfo = null;
        $eddEth = null;
        if ($pregnancy && $pregnancy->getEddDate()) {
            $gaInfo = $gaCalculator->calculateGestationalAge($pregnancy->getEddDate());
            $eddEth = $ethCal->gregorianToEthiopian($pregnancy->getEddDate());
        }

        $appointments = $em->getRepository(Appointment::class)->findBy(
            ['participant' => $participant],
            ['scheduledFor' => 'DESC']
        );

        $outboxMessages = $em->getRepository(OutboxMessage::class)->findBy(
            ['participant' => $participant],
            ['id' => 'DESC']
        );

        return $this->render('participant/show.html.twig', [
            'participant' => $participant,
            'pregnancy' => $pregnancy,
            'gaInfo' => $gaInfo,
            'eddEth' => $eddEth,
            'appointments' => $appointments,
            'outboxMessages' => $outboxMessages,
        ]);
    }

    #[Route('/{id}/delivery', name: 'app_participant_delivery', methods: ['POST'])]
    public function recordDelivery(
        int $id,
        Request $request,
        EntityManagerInterface $em
    ): Response {
        $participant = $em->getRepository(Participant::class)->find($id);
        if (!$participant) {
            throw $this->createNotFoundException();
        }

        $pregnancy = $participant->getCurrentPregnancy();
        if (!$pregnancy) {
            $this->addFlash('error', 'No active pregnancy record found.');
            return $this->redirectToRoute('app_participant_show', ['id' => $id]);
        }

        $delDateStr = (string) $request->request->get('delivery_date', 'now');
        $delPlace = (string) $request->request->get('delivery_place', 'Facility');
        $babyName = (string) $request->request->get('baby_name', 'Baby');

        $deliveryAt = new DateTimeImmutable($delDateStr);

        $pregnancy->setDeliveredAt($deliveryAt);
        $pregnancy->setDeliveryPlace($delPlace);
        $pregnancy->setOutcome(Pregnancy::OUTCOME_LIVE_BIRTH);

        $baby = new Baby();
        $baby->setName($babyName);
        $baby->setDateOfBirth($deliveryAt);
        $pregnancy->addBaby($baby);
        $em->persist($baby);

        // Transition participant to postnatal stream
        $participant->setStatus(Participant::STATUS_POSTNATAL);

        // Cancel remaining pregnancy educational messages
        $em->createQueryBuilder()
            ->update(OutboxMessage::class, 'o')
            ->set('o.status', ':cancelled')
            ->set('o.failureReason', ':reason')
            ->where('o.participant = :p')
            ->andWhere('o.status IN (:pending)')
            ->setParameter('cancelled', OutboxMessage::STATUS_CANCELLED)
            ->setParameter('reason', 'Switched to postnatal stream upon delivery')
            ->setParameter('p', $participant)
            ->setParameter('pending', [OutboxMessage::STATUS_PENDING, OutboxMessage::STATUS_QUEUED])
            ->getQuery()
            ->execute();

        $em->flush();

        $this->addFlash('success', 'Delivery recorded! Switched mother to the postnatal care SMS stream.');
        return $this->redirectToRoute('app_participant_show', ['id' => $id]);
    }

    #[Route('/{id}/opt-out', name: 'app_participant_opt_out', methods: ['POST'])]
    public function optOut(
        int $id,
        MessageDispatcherService $dispatcher,
        EntityManagerInterface $em
    ): Response {
        $participant = $em->getRepository(Participant::class)->find($id);
        if (!$participant) {
            throw $this->createNotFoundException();
        }

        $dispatcher->processOptOut($participant, 'health_worker', 'Opted out via midwife dashboard');
        $this->addFlash('warning', sprintf('Participant %s opted out. All automated messages halted.', $participant->getPublicCode()));

        return $this->redirectToRoute('app_participant_show', ['id' => $id]);
    }

    #[Route('/{id}/loss', name: 'app_participant_loss', methods: ['POST'])]
    public function recordLoss(
        int $id,
        Request $request,
        MessageDispatcherService $dispatcher,
        EntityManagerInterface $em
    ): Response {
        $participant = $em->getRepository(Participant::class)->find($id);
        if (!$participant) {
            throw $this->createNotFoundException();
        }

        $outcome = (string) $request->request->get('loss_outcome', Pregnancy::OUTCOME_STILLBIRTH);
        $dispatcher->processPregnancyLoss($participant, $outcome);

        $this->addFlash('error', sprintf('Sensitive branch activated for %s. Automated baby/pregnancy messages halted immediately.', $participant->getPublicCode()));
        return $this->redirectToRoute('app_participant_show', ['id' => $id]);
    }
}
