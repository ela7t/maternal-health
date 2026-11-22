<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'participant_phones')]
class ParticipantPhone
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Participant::class, inversedBy: 'phones')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Participant $participant = null;

    #[ORM\Column(length: 30)]
    private ?string $numberE164 = null; // e.g., +251912345678

    #[ORM\Column(length: 64, index: true)]
    private ?string $phoneHash = null; // SHA-256 for privacy-preserving lookup

    #[ORM\Column(options: ['default' => true])]
    private bool $isPrimary = true;

    #[ORM\Column(length: 30, options: ['default' => 'self'])]
    private string $ownerType = 'self'; // self, spouse, relative, other

    #[ORM\Column(options: ['default' => 0])]
    private int $failureCount = 0;

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

    public function getNumberE164(): ?string
    {
        return $this->numberE164;
    }

    public function setNumberE164(string $numberE164): static
    {
        $this->numberE164 = $numberE164;
        $this->phoneHash = hash('sha256', trim($numberE164));
        return $this;
    }

    public function getPhoneHash(): ?string
    {
        return $this->phoneHash;
    }

    public function isPrimary(): bool
    {
        return $this->isPrimary;
    }

    public function setIsPrimary(bool $isPrimary): static
    {
        $this->isPrimary = $isPrimary;
        return $this;
    }

    public function getOwnerType(): string
    {
        return $this->ownerType;
    }

    public function setOwnerType(string $ownerType): static
    {
        $this->ownerType = $ownerType;
        return $this;
    }

    public function getFailureCount(): int
    {
        return $this->failureCount;
    }

    public function incrementFailureCount(): static
    {
        $this->failureCount++;
        return $this;
    }

    public function resetFailureCount(): static
    {
        $this->failureCount = 0;
        return $this;
    }
}
