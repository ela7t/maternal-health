<?php

declare(strict_types=1);

namespace App\Command;

use App\Service\Sms\SmsGatewayInterface;
use App\Service\Sms\Ucs2SegmentCalculator;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:sms:test',
    description: 'Sends a direct test SMS via AfroMessage to verify credentials and telecom delivery'
)]
class TestSmsCommand extends Command
{
    public function __construct(
        private readonly SmsGatewayInterface $gateway,
        private readonly Ucs2SegmentCalculator $segmentCalculator,
        private readonly bool $isLive
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('phone', InputArgument::REQUIRED, 'Recipient phone number (e.g. +251911223344 or 0911223344)')
            ->addArgument('message', InputArgument::OPTIONAL, 'Message text to send', 'ጤና ይስጥልኝ! ይህ ከእናቶች ጤና ክትትል ሲስተም የተላከ የሙከራ መልዕክት ነው። (MNH Test SMS)');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $io->title('AfroMessage Live Connection Test');

        $phone = (string) $input->getArgument('phone');
        $text = (string) $input->getArgument('message');

        // Normalize Ethiopian phone number
        $phone = preg_replace('/\s+/', '', $phone);
        if (str_starts_with($phone, '09') || str_starts_with($phone, '07')) {
            $phone = '+251' . substr($phone, 1);
        } elseif (str_starts_with($phone, '251')) {
            $phone = '+' . $phone;
        }

        $calc = $this->segmentCalculator->calculate($text);

        $io->section('Message Details');
        $io->table(
            ['Parameter', 'Value'],
            [
                ['Gateway Provider', $this->gateway->getName()],
                ['SMS_LIVE Mode', $this->isLive ? 'LIVE (Real telecom dispatch enabled)' : 'SANDBOX / FAKE (SMS_LIVE=0 in .env.local)'],
                ['Recipient', $phone],
                ['Character Count', $calc['char_count']],
                ['Detected Encoding', $calc['encoding'] . ($calc['is_geez_amharic'] ? ' (Ge\'ez script)' : '')],
                ['Billable Segments', $calc['segment_count']],
                ['Message Content', $text],
            ]
        );

        if (!$this->isLive) {
            $io->warning('SMS_LIVE is set to 0. To dispatch real messages to an Ethiopian phone, set SMS_LIVE=1 in .env.local');
        }

        $io->section('Dispatching to AfroMessage...');
        $result = $this->gateway->send($phone, $text, 'test_' . uniqid());

        if ($result->successful) {
            $io->success(sprintf('SMS submitted successfully! Gateway ID: %s', $result->gatewayMessageId));
            $io->text('Raw Response:');
            $io->writeln(json_encode($result->rawPayload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));
            return Command::SUCCESS;
        }

        $io->error(sprintf('Delivery failed: %s', $result->errorMessage));
        $io->text('Raw Gateway Payload:');
        $io->writeln(json_encode($result->rawPayload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        return Command::FAILURE;
    }
}
