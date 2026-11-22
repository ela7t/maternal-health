<?php

declare(strict_types=1);

namespace App\Command;

use App\Service\Scheduler\MessageDispatcherService;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Input\InputOption;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;

#[AsCommand(
    name: 'app:scheduler:run',
    description: 'Executes maternal & newborn health message scheduling and outbox dispatch'
)]
class RunSchedulerCommand extends Command
{
    public function __construct(
        private readonly MessageDispatcherService $dispatcher
    ) {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this->addOption('force-now', 'f', InputOption::VALUE_NONE, 'Force dispatch pending messages immediately regardless of future send window');
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $io->title('MNH Automated SMS Scheduler Run');

        $io->section('Planning message schedules...');
        $planResult = $this->dispatcher->planSchedules();
        $io->table(
            ['Metric', 'Count'],
            [
                ['Educational Messages Queued', $planResult['educational_queued']],
                ['ANC/PNC Reminders Queued', $planResult['reminders_queued']],
                ['Missed Appointments Flagged', $planResult['missed_flagged']],
                ['Overdue Pregnancies Flagged', $planResult['overdue_flagged']],
            ]
        );

        $io->section('Dispatching outbox messages...');
        $asOf = $input->getOption('force-now') ? (new \DateTimeImmutable('+2 days')) : null;
        $dispatchResult = $this->dispatcher->dispatchPendingMessages($asOf);
        $io->table(
            ['Outcome', 'Count'],
            [
                ['Sent / Submitted', $dispatchResult['sent']],
                ['Failed', $dispatchResult['failed']],
                ['Retried', $dispatchResult['retried']],
            ]
        );

        $io->success('Scheduler run completed successfully.');

        return Command::SUCCESS;
    }
}
