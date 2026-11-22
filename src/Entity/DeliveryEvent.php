<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'delivery_events')]
class DeliveryEvent
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: OutboxMessage::class, inversedBy: 'deliveryEvents')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?OutboxMessage $outbox = null;

    #[ORM\Column(length: 50)]
    private ?string $rawStatus = null;

    #[ORM\Column(length: 30)]
    private string $mappedStatus = 'unknown'; // submitted, sent, delivered, failed

    #[ORM\Column(type: 'json')]
    private array $rawPayload = [];

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $receivedAt;

    public function __construct()
    {
        $this->receivedAt = new \DateTimeImmutable();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getOutbox(): ?OutboxMessage
    {
        return $this->outbox;
    }

    public function setOutbox(?OutboxMessage $outbox): static
    {
        $this->outbox = $outbox;
        return $this;
    }

    public function getRawStatus(): ?string
    {
        return $this->rawStatus;
    }

    public function setRawStatus(string $rawStatus): static
    {
        $this->rawStatus = $rawStatus;
        return $this;
    }

    public function getMappedStatus(): string
    {
        return $this->mappedStatus;
    }

    public function setMappedStatus(string $mappedStatus): static
    {
        $this->mappedStatus = $mappedStatus;
        return $this;
    }

    public function getRawPayload(): array
    {
        return $this->rawPayload;
    }

    public function setRawPayload(array $rawPayload): static
    {
        $this->rawPayload = $rawPayload;
        return $this;
    }

    public function getReceivedAt(): \DateTimeImmutable
    {
        return $this->receivedAt;
    }
}
