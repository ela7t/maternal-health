<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\Common\Collections\ArrayCollection;
use Doctrine\Common\Collections\Collection;
use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'message_templates')]
class MessageTemplate
{
    public const STREAM_EDUCATIONAL = 'educational';
    public const STREAM_ANC_REMINDER = 'anc_reminder';
    public const STREAM_PNC_REMINDER = 'pnc_reminder';
    public const STREAM_RESCHEDULE = 'reschedule';
    public const STREAM_SUPPORTIVE = 'supportive';

    public const STATUS_DRAFT = 'draft';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_RETIRED = 'retired';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 64, unique: true)]
    private ?string $code = null; // e.g., GA_W20_NUTRITION, ANC_REMIND_72H

    #[ORM\Column(length: 30)]
    private string $stream = self::STREAM_EDUCATIONAL;

    #[ORM\Column(length: 100)]
    private ?string $topic = null; // Nutrition, Danger Signs, Breastfeeding, Immunization, Birth Preparedness

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $gaFromWeeks = null;

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $gaToWeeks = null;

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $pncDayFrom = null;

    #[ORM\Column(type: 'integer', nullable: true)]
    private ?int $pncDayTo = null;

    #[ORM\Column(length: 20, nullable: true)]
    private ?string $riskFilter = null; // low, high, or null (all)

    #[ORM\Column(length: 20, options: ['default' => 'draft'])]
    private string $approvalStatus = self::STATUS_DRAFT;

    #[ORM\OneToMany(mappedBy: 'template', targetEntity: TemplateVariant::class, cascade: ['persist', 'remove'], orphanRemoval: true)]
    private Collection $variants;

    public function __construct()
    {
        $this->variants = new ArrayCollection();
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getCode(): ?string
    {
        return $this->code;
    }

    public function setCode(string $code): static
    {
        $this->code = $code;
        return $this;
    }

    public function getStream(): string
    {
        return $this->stream;
    }

    public function setStream(string $stream): static
    {
        $this->stream = $stream;
        return $this;
    }

    public function getTopic(): ?string
    {
        return $this->topic;
    }

    public function setTopic(string $topic): static
    {
        $this->topic = $topic;
        return $this;
    }

    public function getGaFromWeeks(): ?int
    {
        return $this->gaFromWeeks;
    }

    public function setGaFromWeeks(?int $gaFromWeeks): static
    {
        $this->gaFromWeeks = $gaFromWeeks;
        return $this;
    }

    public function getGaToWeeks(): ?int
    {
        return $this->gaToWeeks;
    }

    public function setGaToWeeks(?int $gaToWeeks): static
    {
        $this->gaToWeeks = $gaToWeeks;
        return $this;
    }

    public function getPncDayFrom(): ?int
    {
        return $this->pncDayFrom;
    }

    public function setPncDayFrom(?int $pncDayFrom): static
    {
        $this->pncDayFrom = $pncDayFrom;
        return $this;
    }

    public function getPncDayTo(): ?int
    {
        return $this->pncDayTo;
    }

    public function setPncDayTo(?int $pncDayTo): static
    {
        $this->pncDayTo = $pncDayTo;
        return $this;
    }

    public function getRiskFilter(): ?string
    {
        return $this->riskFilter;
    }

    public function setRiskFilter(?string $riskFilter): static
    {
        $this->riskFilter = $riskFilter;
        return $this;
    }

    public function getApprovalStatus(): string
    {
        return $this->approvalStatus;
    }

    public function setApprovalStatus(string $approvalStatus): static
    {
        $this->approvalStatus = $approvalStatus;
        return $this;
    }

    /**
     * @return Collection<int, TemplateVariant>
     */
    public function getVariants(): Collection
    {
        return $this->variants;
    }

    public function addVariant(TemplateVariant $variant): static
    {
        if (!$this->variants->contains($variant)) {
            $this->variants->add($variant);
            $variant->setTemplate($this);
        }
        return $this;
    }

    public function getVariant(string $language = 'am', string $framing = 'gain'): ?TemplateVariant
    {
        foreach ($this->variants as $variant) {
            if ($variant->getLanguage() === $language && $variant->getFraming() === $framing) {
                return $variant;
            }
        }
        // Fallback: match language first
        foreach ($this->variants as $variant) {
            if ($variant->getLanguage() === $language) {
                return $variant;
            }
        }
        return $this->variants->first() ?: null;
    }
}
