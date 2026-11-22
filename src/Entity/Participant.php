<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'participants')]
class Participant
{
    public const STATUS_ENROLLED = 'enrolled';
    public const STATUS_ACTIVE_PREGNANT = 'active_pregnant';
    public const STATUS_DELIVERED = 'delivered';
    public const STATUS_POSTNATAL = 'postnatal';
    public const STATUS_COMPLETED = 'completed';
    public const STATUS_OPTED_OUT = 'opted_out';
    public const STATUS_LOSS = 'loss';
    public const STATUS_TRANSFERRED = 'transferred';
    public const STATUS_LOST_TO_FOLLOWUP = 'lost_to_followup';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 64, unique: true)]
    private ?string $publicCode = null;

    #[ORM\Column(type: 'text')]
    private ?string $fullName = null;

    #[ORM\Column(type: 'date_immutable', nullable: true)]
    private ?\DateTimeImmutable $dateOfBirth = null;

    #[ORM\Column(length: 100)]
    private ?string $kebele = null;

    #[ORM\ManyToOne(targetEntity: Facility::class)]
    #[ORM\JoinColumn(nullable: false)]
    private ?Facility $facility = null;

    #[ORM\Column(length: 50, nullable: true)]
    private ?string $studyArm = null; // intervention_gain, intervention_loss, control

    #[ORM\Column(length: 20, options: ['default' => 'am'])]
    private string $preferredLanguage = 'am'; // am, en, gurage

    #[ORM\Column(length: 30, options: ['default' => 'active_pregnant'])]
    private string $status = self::STATUS_ACTIVE_PREGNANT;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $consentAt;

    #[ORM\Column(length: 100)]
    private ?string $consentRecordedBy = null;

    #[ORM\Column(type: 'datetime_immutable')]
    private \DateTimeImmutable $enrolledAt;

    #[ORM\OneToMany(mappedBy: 'participant', targetEntity: ParticipantPhone::class, cascade: ['persist', 'remove'], orphanRemoval: true)]
    private Collection $phones;

    #[ORM\OneToMany(mappedBy: 'participant', targetEntity: Pregnancy::class, cascade: ['persist', 'remove'])]
    private Collection $pregnancies;

    #[ORM\OneToMany(mappedBy: 'participant', targetEntity: Appointment::class, cascade: ['persist', 'remove'])]
    private Collection $appointments;

    public function __construct()
    {
        $this->enrolledAt = new \DateTimeImmutable();
        $this->consentAt = new \DateTimeImmutable();
        $this->phones = new ArrayCollection();
        $this->pregnancies = new ArrayCollection();
        $this->appointments = new ArrayCollection();
        $this->publicCode = 'MOM-' . strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getPublicCode(): ?string
    {
        return $this->publicCode;
    }

    public function setPublicCode(string $publicCode): static
    {
        $this->publicCode = $publicCode;
        return $this;
    }

    public function getFullName(): ?string
    {
        return $this->fullName;
    }

    public function setFullName(string $fullName): static
    {
        $this->fullName = $fullName;
        return $this;
    }

    public function getDateOfBirth(): ?\DateTimeImmutable
    {
        return $this->dateOfBirth;
    }

    public function setDateOfBirth(?\DateTimeImmutable $dateOfBirth): static
    {
        $this->dateOfBirth = $dateOfBirth;
        return $this;
    }

    public function getKebele(): ?string
    {
        return $this->kebele;
    }

    public function setKebele(string $kebele): static
    {
        $this->kebele = $kebele;
        return $this;
    }

    public function getFacility(): ?Facility
    {
        return $this->facility;
    }

    public function setFacility(?Facility $facility): static
    {
        $this->facility = $facility;
        return $this;
    }

    public function getStudyArm(): ?string
    {
        return $this->studyArm;
    }

    public function setStudyArm(?string $studyArm): static
    {
        $this->studyArm = $studyArm;
        return $this;
    }

    public function getPreferredLanguage(): string
    {
        return $this->preferredLanguage;
    }

    public function setPreferredLanguage(string $preferredLanguage): static
    {
        $this->preferredLanguage = $preferredLanguage;
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

    public function getConsentAt(): \DateTimeImmutable
    {
        return $this->consentAt;
    }

    public function setConsentAt(\DateTimeImmutable $consentAt): static
    {
        $this->consentAt = $consentAt;
        return $this;
    }

    public function getConsentRecordedBy(): ?string
    {
        return $this->consentRecordedBy;
    }

    public function setConsentRecordedBy(string $consentRecordedBy): static
    {
        $this->consentRecordedBy = $consentRecordedBy;
        return $this;
    }

    public function getEnrolledAt(): \DateTimeImmutable
    {
        return $this->enrolledAt;
    }

    public function setEnrolledAt(\DateTimeImmutable $enrolledAt): static
    {
        $this->enrolledAt = $enrolledAt;
        return $this;
    }

    /**
     * @return Collection<int, ParticipantPhone>
     */
    public function getPhones(): Collection
    {
        return $this->phones;
    }

    public function addPhone(ParticipantPhone $phone): static
    {
        if (!$this->phones->contains($phone)) {
            $this->phones->add($phone);
            $phone->setParticipant($this);
        }
        return $this;
    }

    public function getPrimaryPhone(): ?ParticipantPhone
    {
        foreach ($this->phones as $phone) {
            if ($phone->isPrimary()) {
                return $phone;
            }
        }
        return $this->phones->first() ?: null;
    }

    /**
     * @return Collection<int, Pregnancy>
     */
    public function getPregnancies(): Collection
    {
        return $this->pregnancies;
    }

    public function getCurrentPregnancy(): ?Pregnancy
    {
        return $this->pregnancies->last() ?: null;
    }

    /**
     * @return Collection<int, Appointment>
     */
    public function getAppointments(): Collection
    {
        return $this->appointments;
    }
}
