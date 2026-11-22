import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding Maternal & Newborn Health initial data...");

  // 1. Facilities
  const f1 = await prisma.facility.upsert({
    where: { code: "HC-WLK-01" },
    update: {},
    create: {
      name: "Wolkite Health Center",
      code: "HC-WLK-01",
      woreda: "Wolkite Town",
      zone: "Gurage",
      phone: "+251113220011",
    },
  });

  const f2 = await prisma.facility.upsert({
    where: { code: "HP-JMA-02" },
    update: {},
    create: {
      name: "Jimma Primary Hospital",
      code: "HP-JMA-02",
      woreda: "Jimma Town",
      zone: "Jimma",
      phone: "+251471110022",
    },
  });

  // 2. Message Templates with Gain and Loss Framing in Amharic & English
  const templates = [
    {
      code: "GA_W20_NUTRITION",
      stream: "educational",
      topic: "Nutrition & Iron Supplementation",
      gaFrom: 19,
      gaTo: 21,
      gainAm: "ጤና ይስጥልኝ! በእርግዝናዎ ወቅት የተመጣጠነ ምግብና የአይረን ክኒን መውሰድ እርስዎና ፅንሱ ጤናማ እንድትሆኑ ይረዳል።",
      lossAm: "ማስጠንቀቂያ፡ በአይረን የበለፀገ ምግብና ክኒን ካልወሰዱ ለደም ማነስና ለፅንሱ መቀንጨር ሊዳረጉ ይችላሉ።",
      gainEn: "Greetings! Eating nutritious meals and taking iron pills keeps you and your baby strong and healthy.",
      lossEn: "Warning: Skipping iron pills and proper nutrition increases risks of maternal anemia and complications.",
    },
    {
      code: "GA_W26_DANGER_SIGNS",
      stream: "educational",
      topic: "Pregnancy Danger Signs",
      gaFrom: 25,
      gaTo: 27,
      gainAm: "ማስታወሻ፡ እንደ ፅንሱ አለመንቀሳቀስ፣ ከፍተኛ ራስ ምታት ወይም ደም መፍሰስ ካጋጠመዎት በፍጥነት ወደ ጤና ጣቢያ ይሂዱ።",
      lossAm: "አስቸኳይ፡ የፅንስ እንቅስቃሴ መቀነስ ወይም ደም መፍሰስ ካዩ ወዲያው ካልታከሙ የፅንስ ህይወት አደጋ ላይ ሊወድቅ ይችላል።",
      gainEn: "Reminder: Contact your clinic immediately if you notice reduced baby movement, bleeding or severe headache.",
      lossEn: "Urgent: Ignoring reduced baby movement or vaginal bleeding can lead to severe life-threatening emergencies.",
    },
    {
      code: "PNC_D03_BREASTFEEDING",
      stream: "educational",
      topic: "Exclusive Breastfeeding & Newborn Care",
      pncFrom: 3,
      pncTo: 5,
      gainAm: "እንኳን ደስ አልዎት! አዲስ ለተወለደው ህፃን የጡት ወተት ብቻ መስጠት በሽታ የመከላከል አቅሙን ያሳድጋል።",
      lossAm: "አስታውሱ፡ በመጀመሪያዎቹ ወራት ከእናት ጡት ወተት ውጪ ውሃ ወይም ምግብ መስጠት ህፃኑን ለከባድ ተቅማጥ ያጋልጣል።",
      gainEn: "Congratulations! Giving only breast milk provides all nutrients and antibodies your baby needs.",
      lossEn: "Caution: Giving water or unprescribed fluids to newborns exposes them to dangerous diarrheal infections.",
    },
    {
      code: "ANC_REMINDER_72H",
      stream: "anc_reminder",
      topic: "72-Hour Antenatal Checkup Reminder",
      gainAm: "ማስታወሻ፡ የቅድመ ወሊድ ክትትል ቀጠሮዎ በቅርቡ ነው። በሰዓቱ መገኘትዎ ጤናማ እርግዝና እንዲኖርዎት ያግዛል።",
      lossAm: "አስፈላጊ፡ የቅድመ ወሊድ ቀጠሮዎን ካላከበሩ የእርስዎና የልጅዎ ጤና ምርመራ ሳይደረግለት ይቀራል።",
      gainEn: "Reminder: Your antenatal checkup is in 3 days. Attending helps ensure a safe, monitored pregnancy.",
      lossEn: "Important: Missing your scheduled antenatal visit leaves potential complications undetected.",
    },
    {
      code: "RESCHEDULE_MISSED_APT",
      stream: "reschedule",
      topic: "Missed Appointment Rescheduling Follow-up",
      gainAm: "ያለፈውን የጤና ቀጠሮዎን አላገኙም። እባክዎ በአቅራቢያዎ ወደሚገኘው ጤና ጣቢያ በመሄድ አዲስ የቀጠሮ ቀን ያስይዙ።",
      lossAm: "ያመለጣችሁን ቀጠሮ በአስቸኳይ ካላደሱ የሚፈለገውን ክትትል ሳያገኙ እንዳይቀሩ ስጋት አለ።",
      gainEn: "You missed your recent clinic visit. Please visit your health center to book a new appointment.",
      lossEn: "Do not leave missed checkups unresolved. Please rebook immediately at your health facility.",
    },
  ];

  for (const t of templates) {
    const tpl = await prisma.messageTemplate.upsert({
      where: { code: t.code },
      update: {},
      create: {
        code: t.code,
        stream: t.stream,
        topic: t.topic,
        gaFromWeeks: t.gaFrom || null,
        gaToWeeks: t.gaTo || null,
        pncDayFrom: t.pncFrom || null,
        pncDayTo: t.pncTo || null,
        approvalStatus: "approved",
      },
    });

    // Amharic Gain
    await prisma.templateVariant.create({
      data: {
        templateId: tpl.id,
        language: "am",
        framing: "gain",
        body: t.gainAm,
        segmentCount: Array.from(t.gainAm).length > 70 ? 2 : 1,
      },
    });

    // Amharic Loss
    await prisma.templateVariant.create({
      data: {
        templateId: tpl.id,
        language: "am",
        framing: "loss",
        body: t.lossAm,
        segmentCount: Array.from(t.lossAm).length > 70 ? 2 : 1,
      },
    });

    // English Gain
    await prisma.templateVariant.create({
      data: {
        templateId: tpl.id,
        language: "en",
        framing: "gain",
        body: t.gainEn,
        segmentCount: Math.ceil(t.gainEn.length / 160),
      },
    });
  }

  // 3. Sample Enrolled Mother (Tigist Haile - GA 20 Weeks)
  const today = new Date();
  const lmpDate = new Date(today);
  lmpDate.setDate(lmpDate.getDate() - 140); // 20 weeks ago
  const eddDate = new Date(lmpDate);
  eddDate.setDate(eddDate.getDate() + 280);

  const m1 = await prisma.participant.upsert({
    where: { publicCode: "MOM-TGST01" },
    update: {},
    create: {
      publicCode: "MOM-TGST01",
      fullName: "Tigist Haile",
      kebele: "Kebele 03",
      facilityId: f1.id,
      studyArm: "intervention_gain",
      preferredLanguage: "am",
      status: "active_pregnant",
      consentRecordedBy: "Sister Almaz Bekele",
      phones: {
        create: {
          numberE164: "+251911223344",
          phoneHash: "hash_test_1",
          isPrimary: true,
          ownerType: "self",
        },
      },
      pregnancies: {
        create: {
          lmpDate,
          eddDate,
          datingMethod: "lmp",
          riskStatus: "low",
          outcome: "ongoing",
        },
      },
      appointments: {
        create: {
          kind: "anc",
          scheduledFor: new Date(Date.now() + 48 * 60 * 60 * 1000), // In 48 hours
          status: "scheduled",
          recordedBy: "Sister Almaz Bekele",
        },
      },
    },
  });

  console.log("Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
