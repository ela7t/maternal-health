<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'pregnancies')]
class Pregnancy
{
    public const RISK_LOW = 'low';
    public const RISK_HIGH = 'high';

    public const DATING_LMP = 'lmp';
    public const DATING_ULTRASOUND = 'ultrasound';
    public const DATING_FUNDAL_HEIGHT = 'fundal_height';

    public const OUTCOME_ONGOING = 'ongoing';
    public const OUTCOME_LIVE_BIRTH = 'live_birth';
    public const OUTCOME_STILLBIRTH = 'stillbirth';
    public const OUTCOME_MISCARRIAGE = 'miscarriage';
    public const OUTCOME_OTHER = 'other';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: Participant::class, inversedBy: 'pregnancies')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?Participant $participant = null;

    #[ORM\Column(type: 'date_immutable', nullable: true)]
    private ?\DateTimeImmutable $lmpDate = null;

    #[ORM\Column(type: 'date_immutable')]
    private ?\DateTimeImmutable $eddDate = null;

    #[ORM\Column(length: 30, options: ['default' => 'lmp'])]
    private string $datingMethod = self::DATING_LMP;

    #[ORM\Column(length: 20, options: ['default' => 'low'])]
    private string $riskStatus = self::RISK_LOW;

    #[ORM\Column(length: 30, options: ['default' => 'ongoing'])]
    private string $outcome = self::OUTCOME_ONGOING;

    #[ORM\Column(type: 'datetime_immutable', nullable: true)]
    private ?\DateTimeImmutable $deliveredAt = null;

    #[ORM\Column(length: 255, nullable: true)]
    private ?string $deliveryPlace = null; // facility, home, on_transit

    #[ORM\OneToMany(mappedBy: 'pregnancy', targetEntity: Baby::class, cascade: ['persist', 'remove'])]
    private Collection $babies;

    public function __construct()
    {
        $this->babies = new ArrayCollection();
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

    public function getLmpDate(): ?\DateTimeImmutable
    {
        return $this->lmpDate;
    }

    public function setLmpDate(?\DateTimeImmutable $lmpDate): static
    {
        $this->lmpDate = $lmpDate;
        return $this;
    }

    public function getEddDate(): ?\DateTimeImmutable
    {
        return $this->eddDate;
    }

    public function setEddDate(\DateTimeImmutable $eddDate): static
    {
        $this->eddDate = $eddDate;
        return $this;
    }

    public function getDatingMethod(): string
    {
        return $this->datingMethod;
    }

    public function setDatingMethod(string $datingMethod): static
    {
        $this->datingMethod = $datingMethod;
        return $this;
    }

    public function getRiskStatus(): string
    {
        return $this->riskStatus;
    }

    public function setRiskStatus(string $riskStatus): static
    {
        $this->riskStatus = $riskStatus;
        return $this;
    }

    public function getOutcome(): string
    {
        return $this->outcome;
    }

    public function setOutcome(string $outcome): static
    {
        $this->outcome = $outcome;
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

    public function getDeliveryPlace(): ?string
    {
        return $this->deliveryPlace;
    }

    public function setDeliveryPlace(?string $deliveryPlace): static
    {
        $this->deliveryPlace = $deliveryPlace;
        return $this;
    }

    /**
     * @return Collection<int, Baby>
     */
    public function getBabies(): Collection
    {
        return $this->babies;
    }

    public function addBaby(Baby $baby): static
    {
        if (!$this->babies->contains($baby)) {
            $this->babies->add($baby);
            $baby->setPregnancy($this);
        }
        return $this;
    }
}
