import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const facilities = await prisma.facility.count();
  const templates = await prisma.messageTemplate.count();
  const participants = await prisma.participant.count();
  const phones = await prisma.participantPhone.findFirst();
  console.log(`Facilities: ${facilities}`);
  console.log(`Message Templates: ${templates}`);
  console.log(`Participants: ${participants}`);
  console.log(`Sample Phone: ${phones?.numberE164}`);
  await prisma.$disconnect();
}

main();
