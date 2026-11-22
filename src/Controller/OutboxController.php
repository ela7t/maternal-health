<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\OutboxMessage;
use App\Service\Scheduler\MessageDispatcherService;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/outbox')]
class OutboxController extends AbstractController
{
    #[Route('', name: 'app_outbox_list', methods: ['GET'])]
    public function list(Request $request, EntityManagerInterface $em): Response
    {
        $status = $request->query->get('status');

        $qb = $em->getRepository(OutboxMessage::class)->createQueryBuilder('o')
            ->join('o.participant', 'p')
            ->leftJoin('p.facility', 'f')
            ->leftJoin('o.phone', 'ph')
            ->addSelect('p', 'f', 'ph')
            ->orderBy('o.id', 'DESC');

        if ($status) {
            $qb->andWhere('o.status = :status')->setParameter('status', $status);
        }

        $messages = $qb->getQuery()->getResult();

        return $this->render('outbox/list.html.twig', [
            'messages' => $messages,
            'currentStatus' => $status,
        ]);
    }

    #[Route('/run-now', name: 'app_outbox_run_now', methods: ['POST'])]
    public function runNow(MessageDispatcherService $dispatcher): Response
    {
        $plan = $dispatcher->planSchedules();
        $dispatch = $dispatcher->dispatchPendingMessages(new \DateTimeImmutable('+2 days'));

        $this->addFlash('success', sprintf(
            'Scheduler executed! Queued: %d educational, %d reminders. Dispatched: %d SMS sent.',
            $plan['educational_queued'],
            $plan['reminders_queued'],
            $dispatch['sent']
        ));

        return $this->redirectToRoute('app_outbox_list');
    }
}
