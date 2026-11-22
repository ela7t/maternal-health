<?php

declare(strict_types=1);

namespace App\Controller;

use App\Entity\MessageTemplate;
use App\Service\Sms\Ucs2SegmentCalculator;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

class MessageBankController extends AbstractController
{
    #[Route('/messages', name: 'app_message_bank', methods: ['GET'])]
    public function index(EntityManagerInterface $em): Response
    {
        $templates = $em->getRepository(MessageTemplate::class)->findBy([], ['id' => 'ASC']);

        return $this->render('message_bank/index.html.twig', [
            'templates' => $templates,
        ]);
    }

    #[Route('/api/sms/calculate-segments', name: 'app_api_calculate_segments', methods: ['POST'])]
    public function calculateSegments(Request $request, Ucs2SegmentCalculator $calculator): JsonResponse
    {
        $data = json_decode($request->getContent(), true) ?? [];
        $text = (string) ($data['text'] ?? '');

        $result = $calculator->calculate($text);

        return $this->json($result);
    }
}
