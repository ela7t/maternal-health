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

  // 4. Participant 2: Postnatal Mother (Fatuma Mohammed)
  const deliveryDate = new Date(today);
  deliveryDate.setDate(deliveryDate.getDate() - 4);
  const lmpDate2 = new Date(deliveryDate);
  lmpDate2.setDate(lmpDate2.getDate() - 280);

  const m2 = await prisma.participant.upsert({
    where: { publicCode: "MOM-FTMA02" },
    update: {},
    create: {
      publicCode: "MOM-FTMA02",
      fullName: "Fatuma Mohammed",
      kebele: "Kebele 01",
      facilityId: f1.id,
      studyArm: "intervention_loss",
      preferredLanguage: "am",
      status: "postnatal",
      consentRecordedBy: "Sister Almaz Bekele",
      phones: {
        create: {
          numberE164: "+251922334455",
          phoneHash: "hash_test_2",
          isPrimary: true,
          ownerType: "spouse",
        },
      },
      pregnancies: {
        create: {
          lmpDate: lmpDate2,
          eddDate: deliveryDate,
          deliveredAt: deliveryDate,
          deliveryPlace: "Wolkite Health Center",
          outcome: "live_birth",
          datingMethod: "lmp",
          riskStatus: "low",
          babies: {
            create: {
              name: "Baby Dawit",
              babyCode: "BABY-DW01",
              dateOfBirth: deliveryDate,
              status: "alive",
            },
          },
        },
      },
    },
  });

  // 5. Participant 3: Missed Appointment Mother (Genet Wolde)
  const lmpDate3 = new Date(today);
  lmpDate3.setDate(lmpDate3.getDate() - 182); // 26 weeks
  const eddDate3 = new Date(lmpDate3);
  eddDate3.setDate(eddDate3.getDate() + 280);

  const m3 = await prisma.participant.upsert({
    where: { publicCode: "MOM-GNET03" },
    update: {},
    create: {
      publicCode: "MOM-GNET03",
      fullName: "Genet Wolde",
      kebele: "Kebele 05",
      facilityId: f2.id,
      studyArm: "intervention_gain",
      preferredLanguage: "am",
      status: "active_pregnant",
      consentRecordedBy: "Dr. Tadesse Gemechu",
      phones: {
        create: {
          numberE164: "+251933445566",
          phoneHash: "hash_test_3",
          isPrimary: true,
          ownerType: "self",
        },
      },
      pregnancies: {
        create: {
          lmpDate: lmpDate3,
          eddDate: eddDate3,
          datingMethod: "lmp",
          riskStatus: "low",
          outcome: "ongoing",
        },
      },
      appointments: {
        create: {
          kind: "anc",
          scheduledFor: new Date(Date.now() - 48 * 60 * 60 * 1000), // 48 hours ago
          status: "missed",
          recordedBy: "Dr. Tadesse Gemechu",
          notes: "Routine ANC checkup - missed attendance",
        },
      },
    },
  });

  // 6. Seed sample outbox messages
  const sampleVariant = await prisma.templateVariant.findFirst({
    where: { template: { code: "GA_W20_NUTRITION" }, language: "am", framing: "gain" },
  });

  if (sampleVariant) {
    const existingMsg = await prisma.outboxMessage.findFirst({
      where: { participantId: m1.id },
    });
    if (!existingMsg) {
      const p1Phone = await prisma.participantPhone.findFirst({ where: { participantId: m1.id } });
      await prisma.outboxMessage.create({
        data: {
          participantId: m1.id,
          phoneId: p1Phone.id,
          variantId: sampleVariant.id,
          messageContent: sampleVariant.body,
          segments: 2,
          status: "delivered",
          scheduledAt: new Date(Date.now() - 2 * 3600 * 1000),
          sentAt: new Date(Date.now() - 2 * 3600 * 1000),
          deliveredAt: new Date(Date.now() - 2 * 3600 * 1000),
          idempotencyKey: `SEED_MSG_M1_${Date.now()}`,
          callbackToken: "seed_token_1",
          deliveryEvents: {
            create: {
              rawStatus: "DELIVERED",
              mappedStatus: "delivered",
              rawPayload: { status: "DELIVERED" },
            },
          },
        },
      });
    }
  }

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
