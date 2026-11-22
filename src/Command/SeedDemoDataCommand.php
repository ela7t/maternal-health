<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\Appointment;
use App\Entity\Baby;
use App\Entity\Facility;
use App\Entity\MessageTemplate;
use App\Entity\Participant;
use App\Entity\ParticipantPhone;
use App\Entity\Pregnancy;
use App\Entity\TemplateVariant;
use App\Entity\User;
use App\Service\Clinical\GestationalAgeCalculator;
use App\Service\Sms\Ucs2SegmentCalculator;
use DateTimeImmutable;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\Console\Style\SymfonyStyle;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[AsCommand(
    name: 'app:seed:demo-data',
    description: 'Seeds initial clinical facilities, users, message template bank, and sample participants'
)]
class SeedDemoDataCommand extends Command
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly UserPasswordHasherInterface $hasher,
        private readonly Ucs2SegmentCalculator $segmentCalculator,
        private readonly GestationalAgeCalculator $gaCalculator
    ) {
        parent::__construct();
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $io = new SymfonyStyle($input, $output);
        $io->title('Seeding Maternal and Newborn Health Demo Data');

        // 1. Facilities
        $facility1 = new Facility();
        $facility1->setName('Wolkite Health Center');
        $facility1->setCode('HC-WLK-01');
        $facility1->setWoreda('Wolkite Town');
        $facility1->setZone('Gurage');
        $facility1->setPhone('+251113220011');
        $this->em->persist($facility1);

        $facility2 = new Facility();
        $facility2->setName('Jimma Primary Hospital');
        $facility2->setCode('HP-JMA-02');
        $facility2->setWoreda('Jimma Town');
        $facility2->setZone('Jimma');
        $facility2->setPhone('+251471110022');
        $this->em->persist($facility2);

        // 2. Users
        $admin = new User();
        $admin->setUsername('admin');
        $admin->setEmail('admin@mnh.et');
        $admin->setFullName('System Administrator');
        $admin->setRoles(['ROLE_ADMIN']);
        $admin->setPassword($this->hasher->hashPassword($admin, 'admin123'));
        $this->em->persist($admin);

        $midwife = new User();
        $midwife->setUsername('midwife');
        $midwife->setEmail('midwife@wolkite.mnh.et');
        $midwife->setFullName('Sister Almaz Bekele (Midwife)');
        $midwife->setFacility($facility1);
        $midwife->setRoles(['ROLE_MIDWIFE']);
        $midwife->setPassword($this->hasher->hashPassword($midwife, 'midwife123'));
        $this->em->persist($midwife);

        $supervisor = new User();
        $supervisor->setUsername('supervisor');
        $supervisor->setEmail('supervisor@gurage.mnh.et');
        $supervisor->setFullName('Dr. Tadesse Gemechu (Zone Supervisor)');
        $supervisor->setRoles(['ROLE_SUPERVISOR']);
        $supervisor->setPassword($this->hasher->hashPassword($supervisor, 'super123'));
        $this->em->persist($supervisor);

        $researcher = new User();
        $researcher->setUsername('researcher');
        $researcher->setEmail('researcher@wolkite.edu.et');
        $researcher->setFullName('Abebe Kebede (Lead Researcher)');
        $researcher->setRoles(['ROLE_RESEARCHER']);
        $researcher->setPassword($this->hasher->hashPassword($researcher, 'research123'));
        $this->em->persist($researcher);

        // 3. Message Template Bank (with Gain and Loss framing in Amharic & English)
        $templatesData = [
            [
                'code' => 'GA_W20_NUTRITION',
                'stream' => MessageTemplate::STREAM_EDUCATIONAL,
                'topic' => 'Nutrition & Iron',
                'gaFrom' => 19,
                'gaTo' => 21,
                'pncFrom' => null,
                'pncTo' => null,
                'gain_am' => 'ጤና ይስጥልኝ! በእርግዝናዎ ወቅት የተመጣጠነ ምግብና የአይረን ክኒን መውሰድ እርስዎና ፅንሱ ጤናማ እንድትሆኑ ይረዳል።',
                'loss_am' => 'ማስጠንቀቂያ፡ በአይረን የበለፀገ ምግብና ክኒን ካልወሰዱ ለደም ማነስና ለፅንሱ መቀንጨር ሊዳረጉ ይችላሉ።',
                'gain_en' => 'Greetings! Eating nutritious meals and taking iron pills keeps you and your growing baby strong and healthy.',
                'loss_en' => 'Warning: Neglecting iron pills and good nutrition risks maternal anemia and poor fetal development.',
            ],
            [
                'code' => 'GA_W26_DANGER_SIGNS',
                'stream' => MessageTemplate::STREAM_EDUCATIONAL,
                'topic' => 'Danger Signs',
                'gaFrom' => 25,
                'gaTo' => 27,
                'pncFrom' => null,
                'pncTo' => null,
                'gain_am' => 'ማስታወሻ፡ እንደ ፅንሱ አለመንቀሳቀስ፣ ከፍተኛ ራስ ምታት ወይም ደም መፍሰስ ካጋጠመዎት በፍጥነት ወደ ጤና ጣቢያ ይሂዱ።',
                'loss_am' => 'አስቸኳይ፡ የፅንስ እንቅስቃሴ መቀነስ ወይም ደም መፍሰስ ካዩ ወዲያው ካልታከሙ የፅንስ ህይወት አደጋ ላይ ሊወድቅ ይችላል።',
                'gain_en' => 'Reminder: If you notice reduced fetal movement, headache or bleeding, visiting the health center quickly protects your baby.',
                'loss_en' => 'Urgent: Ignoring signs like vaginal bleeding or lack of baby movement can risk severe complications.',
            ],
            [
                'code' => 'PNC_D03_BREASTFEEDING',
                'stream' => MessageTemplate::STREAM_EDUCATIONAL,
                'topic' => 'Exclusive Breastfeeding',
                'gaFrom' => null,
                'gaTo' => null,
                'pncFrom' => 3,
                'pncTo' => 5,
                'gain_am' => 'እንኳን ደስ አልዎት! አዲስ ለተወለደው ህፃን የጡት ወተት ብቻ መስጠት በሽታ የመከላከል አቅሙን ያሳድጋል።',
                'loss_am' => 'አስታውሱ፡ በመጀመሪያዎቹ ወራት ከእናት ጡት ወተት ውጪ ውሃ ወይም ምግብ መስጠት ህፃኑን ለከባድ ተቅማጥ ያጋልጣል።',
                'gain_en' => 'Congratulations! Exclusive breastfeeding gives your baby essential nutrients and strong immunity.',
                'loss_en' => 'Caution: Giving water or formula to your newborn exposes them to severe digestive infections.',
            ],
            [
                'code' => 'ANC_REMINDER_72H',
                'stream' => MessageTemplate::STREAM_ANC_REMINDER,
                'topic' => 'ANC Checkup Reminder',
                'gaFrom' => null,
                'gaTo' => null,
                'pncFrom' => null,
                'pncTo' => null,
                'gain_am' => 'ማስታወሻ፡ የቅድመ ወሊድ ክትትል ቀጠሮዎ በቅርቡ ነው። በሰዓቱ መገኘትዎ ጤናማ እርግዝና እንዲኖርዎት ያግዛል።',
                'loss_am' => 'አስፈላጊ፡ የቅድመ ወሊድ ቀጠሮዎን ካላከበሩ የእርስዎና የልጅዎ ጤና ምርመራ ሳይደረግለት ይቀራል።',
                'gain_en' => 'Reminder: Your antenatal appointment is in 3 days. Attending ensures a safe pregnancy.',
                'loss_en' => 'Important: Missing your antenatal checkup leaves potential pregnancy complications undetected.',
            ],
            [
                'code' => 'RESCHEDULE_MISSED_APT',
                'stream' => MessageTemplate::STREAM_RESCHEDULE,
                'topic' => 'Missed Appointment Follow-up',
                'gaFrom' => null,
                'gaTo' => null,
                'pncFrom' => null,
                'pncTo' => null,
                'gain_am' => 'ያለፈውን የጤና ቀጠሮዎን አላገኙም። እባክዎ በአቅራቢያዎ ወደሚገኘው ጤና ጣቢያ በመሄድ አዲስ የቀጠሮ ቀን ያስይዙ።',
                'loss_am' => 'ያመለጣችሁን ቀጠሮ በአስቸኳይ ካላደሱ የሚፈለገውን ክትትል ሳያገኙ እንዳይቀሩ ስጋት አለ።',
                'gain_en' => 'You missed your scheduled visit. Please visit the health center promptly to reschedule.',
                'loss_en' => 'Do not leave missed checkups unresolved. Visit your health facility immediately for rebooking.',
            ],
        ];

        foreach ($templatesData as $data) {
            $tpl = new MessageTemplate();
            $tpl->setCode($data['code']);
            $tpl->setStream($data['stream']);
            $tpl->setTopic($data['topic']);
            $tpl->setGaFromWeeks($data['gaFrom']);
            $tpl->setGaToWeeks($data['gaTo']);
            $tpl->setPncDayFrom($data['pncFrom']);
            $tpl->setPncDayTo($data['pncTo']);
            $tpl->setApprovalStatus(MessageTemplate::STATUS_APPROVED);

            // Amharic Gain
            $vAmGain = new TemplateVariant();
            $vAmGain->setLanguage('am');
            $vAmGain->setFraming(TemplateVariant::FRAMING_GAIN);
            $vAmGain->setBody($data['gain_am']);
            $vAmGain->setSegmentCount($this->segmentCalculator->calculate($data['gain_am'])['segment_count']);
            $tpl->addVariant($vAmGain);

            // Amharic Loss
            $vAmLoss = new TemplateVariant();
            $vAmLoss->setLanguage('am');
            $vAmLoss->setFraming(TemplateVariant::FRAMING_LOSS);
            $vAmLoss->setBody($data['loss_am']);
            $vAmLoss->setSegmentCount($this->segmentCalculator->calculate($data['loss_am'])['segment_count']);
            $tpl->addVariant($vAmLoss);

            // English Gain
            $vEnGain = new TemplateVariant();
            $vEnGain->setLanguage('en');
            $vEnGain->setFraming(TemplateVariant::FRAMING_GAIN);
            $vEnGain->setBody($data['gain_en']);
            $vEnGain->setSegmentCount($this->segmentCalculator->calculate($data['gain_en'])['segment_count']);
            $tpl->addVariant($vEnGain);

            $this->em->persist($tpl);
        }

        // 4. Sample Participants
        $today = new DateTimeImmutable('today');

        // Participant 1: Pregnant woman at GA 20 weeks with ANC appointment in 48 hours
        $p1 = new Participant();
        $p1->setFullName('Tigist Haile');
        $p1->setDateOfBirth(new DateTimeImmutable('1998-05-14'));
        $p1->setKebele('Kebele 03');
        $p1->setFacility($facility1);
        $p1->setPreferredLanguage('am');
        $p1->setStudyArm('intervention_gain');
        $p1->setConsentRecordedBy('Sister Almaz Bekele');
        $p1->setStatus(Participant::STATUS_ACTIVE_PREGNANT);

        $phone1 = new ParticipantPhone();
        $phone1->setNumberE164('+251911223344');
        $phone1->setIsPrimary(true);
        $phone1->setOwnerType('self');
        $p1->addPhone($phone1);

        $preg1 = new Pregnancy();
        $preg1->setLmpDate($today->modify('-140 days')); // 20 weeks ago
        $preg1->setEddDate($this->gaCalculator->calculateEddFromLmp($preg1->getLmpDate()));
        $preg1->setDatingMethod(Pregnancy::DATING_LMP);
        $preg1->setRiskStatus(Pregnancy::RISK_LOW);
        $preg1->setParticipant($p1);
        $this->em->persist($preg1);

        $apt1 = new Appointment();
        $apt1->setParticipant($p1);
        $apt1->setKind(Appointment::KIND_ANC);
        $apt1->setScheduledFor($today->modify('+48 hours')->setTime(9, 0, 0));
        $apt1->setStatus(Appointment::STATUS_SCHEDULED);
        $apt1->setRecordedBy('Sister Almaz Bekele');
        $this->em->persist($apt1);

        $this->em->persist($p1);

        // Participant 2: Postnatal Mother delivered 4 days ago
        $p2 = new Participant();
        $p2->setFullName('Fatuma Mohammed');
        $p2->setDateOfBirth(new DateTimeImmutable('1995-11-20'));
        $p2->setKebele('Kebele 01');
        $p2->setFacility($facility1);
        $p2->setPreferredLanguage('am');
        $p2->setStudyArm('intervention_loss');
        $p2->setConsentRecordedBy('Sister Almaz Bekele');
        $p2->setStatus(Participant::STATUS_POSTNATAL);

        $phone2 = new ParticipantPhone();
        $phone2->setNumberE164('+251922334455');
        $phone2->setIsPrimary(true);
        $phone2->setOwnerType('spouse');
        $p2->addPhone($phone2);

        $preg2 = new Pregnancy();
        $preg2->setLmpDate($today->modify('-284 days'));
        $preg2->setEddDate($today->modify('-4 days'));
        $preg2->setDeliveredAt($today->modify('-4 days')->setTime(14, 30, 0));
        $preg2->setDeliveryPlace('Wolkite Health Center');
        $preg2->setOutcome(Pregnancy::OUTCOME_LIVE_BIRTH);
        $preg2->setParticipant($p2);

        $baby2 = new Baby();
        $baby2->setName('Baby Dawit');
        $baby2->setDateOfBirth($today->modify('-4 days'));
        $preg2->addBaby($baby2);
        $this->em->persist($baby2);
        $this->em->persist($preg2);

        $this->em->persist($p2);

        // Participant 3: Mother who missed her appointment 2 days ago
        $p3 = new Participant();
        $p3->setFullName('Genet Wolde');
        $p3->setDateOfBirth(new DateTimeImmutable('2001-03-08'));
        $p3->setKebele('Kebele 05');
        $p3->setFacility($facility2);
        $p3->setPreferredLanguage('am');
        $p3->setStudyArm('intervention_gain');
        $p3->setConsentRecordedBy('Dr. Tadesse Gemechu');
        $p3->setStatus(Participant::STATUS_ACTIVE_PREGNANT);

        $phone3 = new ParticipantPhone();
        $phone3->setNumberE164('+251933445566');
        $phone3->setIsPrimary(true);
        $phone3->setOwnerType('self');
        $p3->addPhone($phone3);

        $preg3 = new Pregnancy();
        $preg3->setLmpDate($today->modify('-182 days')); // 26 weeks
        $preg3->setEddDate($this->gaCalculator->calculateEddFromLmp($preg3->getLmpDate()));
        $preg3->setParticipant($p3);
        $this->em->persist($preg3);

        $apt3 = new Appointment();
        $apt3->setParticipant($p3);
        $apt3->setKind(Appointment::KIND_ANC);
        $apt3->setScheduledFor($today->modify('-48 hours')->setTime(10, 0, 0));
        $apt3->setStatus(Appointment::STATUS_SCHEDULED); // Stale/missed appointment
        $apt3->setRecordedBy('Dr. Tadesse Gemechu');
        $this->em->persist($apt3);

        $this->em->persist($p3);

        $this->em->flush();

        $io->success('Demo facilities, users, message template bank, and participants seeded successfully!');
        return Command::SUCCESS;
    }
}
