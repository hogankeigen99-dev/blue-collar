import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const alice = await prisma.worker.create({
    data: { name: "Alice Johnson", role: "Electrician", phone: "555-0101" },
  });
  const bob = await prisma.worker.create({
    data: { name: "Bob Martinez", role: "Plumber", phone: "555-0102" },
  });

  const customer = await prisma.customer.create({
    data: {
      name: "Riverside Apartments",
      address: "123 River Rd",
      phone: "555-0200",
    },
  });

  await prisma.job.create({
    data: {
      title: "Fix breaker panel",
      description: "Replace faulty breaker in unit 4B",
      address: "123 River Rd, Unit 4B",
      status: "SCHEDULED",
      customerId: customer.id,
      assignments: { create: [{ workerId: alice.id }] },
    },
  });

  await prisma.job.create({
    data: {
      title: "Leaking pipe under sink",
      description: "Kitchen sink leak, unit 2A",
      address: "123 River Rd, Unit 2A",
      status: "IN_PROGRESS",
      customerId: customer.id,
      assignments: { create: [{ workerId: bob.id }] },
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
