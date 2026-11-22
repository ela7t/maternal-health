<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'appointments')]
class Appointment
{
    public const KIND_ANC = 'anc';
    public const KIND_PNC = 'pnc';

    public const STATUS_SCHEDULED = 'scheduled';
    public const STATUS_ATTENDED = 'attended';
    public const STATUS_MISSED = 'missed';
    public const STATUS_RESCHEDULED = 'rescheduled';
    public const STATUS_CANCELLED = 'cancelled';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Participant::class, inversedBy: 'appointments')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Participant $participant = null;

    #[ORM\Column(length: 20, options: ['default' => 'anc'])]
    private string $kind = self::KIND_ANC;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $scheduledFor;

    #[ORM\Column(length: 30, options: ['default' => 'scheduled'])]
    private string $status = self::STATUS_SCHEDULED;

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $recordedBy = null;

    #[ORM\OneToOne(targetEntity: self::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?self $rescheduledFrom = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $notes = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getParticipant(): ?Participant
    {
        return $this->participant;
    }

    public function setParticipant(?Participant $participant): static
    {
        $this->participant = $participant;
        return $this;
    }

    public function getKind(): string
    {
        return $this->kind;
    }

    public function setKind(string $kind): static
    {
        $this->kind = $kind;
        return $this;
    }

    public function getScheduledFor(): \DateTimeImmutable
    {
        return $this->scheduledFor;
    }

    public function setScheduledFor(\DateTimeImmutable $scheduledFor): static
    {
        $this->scheduledFor = $scheduledFor;
        return $this;
    }

    public function getStatus(): string
    {
        return $this->status;
    }

    public function setStatus(string $status): static
    {
        $this->status = $status;
        return $this;
    }

    public function getRecordedBy(): ?string
    {
        return $this->recordedBy;
    }

    public function setRecordedBy(?string $recordedBy): static
    {
        $this->recordedBy = $recordedBy;
        return $this;
    }

    public function getRescheduledFrom(): ?self
    {
        return $this->rescheduledFrom;
    }

    public function setRescheduledFrom(?self $rescheduledFrom): static
    {
        $this->rescheduledFrom = $rescheduledFrom;
        return $this;
    }

    public function getNotes(): ?string
    {
        return $this->notes;
    }

    public function setNotes(?string $notes): static
    {
        $this->notes = $notes;
        return $this;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}
