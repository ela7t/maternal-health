<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'outbox_messages')]
class OutboxMessage
{
    public const STATUS_PENDING = 'pending';
    public const STATUS_QUEUED = 'queued';
    public const STATUS_SUBMITTED = 'submitted';
    public const STATUS_SENT = 'sent';
    public const STATUS_DELIVERED = 'delivered';
    public const STATUS_FAILED = 'failed';
    public const STATUS_CANCELLED = 'cancelled';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Participant::class)]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Participant $participant = null;

    #[ORM\ManyToOne(targetEntity: ParticipantPhone::class)]
    #[ORM\JoinColumn(nullable: false)]
    private ?ParticipantPhone $phone = null;

    #[ORM\ManyToOne(targetEntity: TemplateVariant::class)]
    #[ORM\JoinColumn(nullable: true, onDelete: 'SET NULL')]
    private ?TemplateVariant $variant = null;

    #[ORM\Column(length: 128, unique: true)]
    private ?string $idempotencyKey = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $scheduledAt;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $windowEnd = null;

    #[ORM\Column(length: 30, options: ['default' => 'pending'])]
    private string $status = self::STATUS_PENDING;

    #[ORM\Column(options: ['default' => 0])]
    private int $attempts = 0;

    #[ORM\Column(length: 100, nullable: true)]
    private ?string $gatewayMessageId = null;

    #[ORM\Column(length: 64, unique: true, nullable: true)]
    private ?string $callbackToken = null;

    #[ORM\Column(type: 'integer', options: ['default' => 1])]
    private int $segments = 1;

    #[ORM\Column(type: 'text')]
    private ?string $messageContent = null;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $sentAt = null;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $deliveredAt = null;

    #[ORM\Column(type: 'text', nullable: true)]
    private ?string $failureReason = null;

    #[ORM\OneToMany(mappedBy: 'outbox', targetEntity: DeliveryEvent::class, cascade: ['persist', 'remove'])]
    private Collection $deliveryEvents;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $createdAt;

    public function __construct()
    {
        $this->createdAt = new \DateTimeImmutable();
        $this->scheduledAt = new \DateTimeImmutable();
        $this->deliveryEvents = new ArrayCollection();
        $this->callbackToken = bin2hex(random_bytes(24));
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

    public function getPhone(): ?ParticipantPhone
    {
        return $this->phone;
    }

    public function setPhone(?ParticipantPhone $phone): static
    {
        $this->phone = $phone;
        return $this;
    }

    public function getVariant(): ?TemplateVariant
    {
        return $this->variant;
    }

    public function setVariant(?TemplateVariant $variant): static
    {
        $this->variant = $variant;
        return $this;
    }

    public function getIdempotencyKey(): ?string
    {
        return $this->idempotencyKey;
    }

    public function setIdempotencyKey(string $idempotencyKey): static
    {
        $this->idempotencyKey = $idempotencyKey;
        return $this;
    }

    public function getScheduledAt(): \DateTimeImmutable
    {
        return $this->scheduledAt;
    }

    public function setScheduledAt(\DateTimeImmutable $scheduledAt): static
    {
        $this->scheduledAt = $scheduledAt;
        return $this;
    }

    public function getWindowEnd(): ?\DateTimeImmutable
    {
        return $this->windowEnd;
    }

    public function setWindowEnd(?\DateTimeImmutable $windowEnd): static
    {
        $this->windowEnd = $windowEnd;
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

    public function getAttempts(): int
    {
        return $this->attempts;
    }

    public function incrementAttempts(): static
    {
        $this->attempts++;
        return $this;
    }

    public function getGatewayMessageId(): ?string
    {
        return $this->gatewayMessageId;
    }

    public function setGatewayMessageId(?string $gatewayMessageId): static
    {
        $this->gatewayMessageId = $gatewayMessageId;
        return $this;
    }

    public function getCallbackToken(): ?string
    {
        return $this->callbackToken;
    }

    public function getSegments(): int
    {
        return $this->segments;
    }

    public function setSegments(int $segments): static
    {
        $this->segments = $segments;
        return $this;
    }

    public function getMessageContent(): ?string
    {
        return $this->messageContent;
    }

    public function setMessageContent(string $messageContent): static
    {
        $this->messageContent = $messageContent;
        return $this;
    }

    public function getSentAt(): ?\DateTimeImmutable
    {
        return $this->sentAt;
    }

    public function setSentAt(?\DateTimeImmutable $sentAt): static
    {
        $this->sentAt = $sentAt;
        return $this;
    }

    public function getDeliveredAt(): ?\DateTimeImmutable
    {
        return $this->deliveredAt;
    }

    public function setDeliveredAt(?\DateTimeImmutable $deliveredAt): static
    {
        $this->deliveredAt = $deliveredAt;
        return $this;
    }

    public function getFailureReason(): ?string
    {
        return $this->failureReason;
    }

    public function setFailureReason(?string $failureReason): static
    {
        $this->failureReason = $failureReason;
        return $this;
    }

    /**
     * @return Collection<int, DeliveryEvent>
     */
    public function getDeliveryEvents(): Collection
    {
        return $this->deliveryEvents;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}
