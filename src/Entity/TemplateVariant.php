<?php

declare(strict_types=1);

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

#[ORM\Entity]
#[ORM\Table(name: 'template_variants')]
class TemplateVariant
{
    public const FRAMING_GAIN = 'gain';
    public const FRAMING_LOSS = 'loss';
    public const FRAMING_NEUTRAL = 'neutral';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne(targetEntity: MessageTemplate::class, inversedBy: 'variants')]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private ?MessageTemplate $template = null;

    #[ORM\Column(length: 20, options: ['default' => 'am'])]
    private string $language = 'am'; // am, en, gurage

    #[ORM\Column(length: 20, options: ['default' => 'gain'])]
    private string $framing = self::FRAMING_GAIN; // gain, loss, neutral

    #[ORM\Column(type: 'text')]
    private ?string $body = null;

    #[ORM\Column(type: 'integer', options: ['default' => 1])]
    private int $segmentCount = 1;

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getTemplate(): ?MessageTemplate
    {
        return $this->template;
    }

    public function setTemplate(?MessageTemplate $template): static
    {
        $this->template = $template;
        return $this;
    }

    public function getLanguage(): string
    {
        return $this->language;
    }

    public function setLanguage(string $language): static
    {
        $this->language = $language;
        return $this;
    }

    public function getFraming(): string
    {
        return $this->framing;
    }

    public function setFraming(string $framing): static
    {
        $this->framing = $framing;
        return $this;
    }

    public function getBody(): ?string
    {
        return $this->body;
    }

    public function setBody(string $body): static
    {
        $this->body = $body;
        return $this;
    }

    public function getSegmentCount(): int
    {
        return $this->segmentCount;
    }

    public function setSegmentCount(int $segmentCount): static
    {
        $this->segmentCount = $segmentCount;
        return $this;
    }
}
