<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'babies')]
class Baby
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Pregnancy::class, inversedBy: 'babies')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Pregnancy $pregnancy = null;

    #[ORM\Column(length: 64, unique: true)]
    private ?string $babyCode = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $name = null;

    #[ORM\Column(type: 'date_immutable')]
    private ?\DateTimeImmutable $dateOfBirth = null;

    #[ORM\Column(length: 30, options: ['default' => 'alive'])]
    private string $status = 'alive'; // alive, neonatal_death

    public function __construct()
    {
        $this->babyCode = 'BABY-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getPregnancy(): ?Pregnancy
    {
        return $this->pregnancy;
    }

    public function setPregnancy(?Pregnancy $pregnancy): static
    {
        $this->pregnancy = $pregnancy;
        return $this;
    }

    public function getBabyCode(): ?string
    {
        return $this->babyCode;
    }

    public function setBabyCode(string $babyCode): static
    {
        $this->babyCode = $babyCode;
        return $this;
    }

    public function getName(): ?string
    {
        return $this->name;
    }

    public function setName(?string $name): static
    {
        $this->name = $name;
        return $this;
    }

    public function getDateOfBirth(): ?\DateTimeImmutable
    {
        return $this->dateOfBirth;
    }

    public function setDateOfBirth(\DateTimeImmutable $dateOfBirth): static
    {
        $this->dateOfBirth = $dateOfBirth;
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
}
