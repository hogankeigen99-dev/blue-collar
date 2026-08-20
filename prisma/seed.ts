import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.create({
    data: { name: "Riverside Home Services", slug: "riverside" },
  });

  const passwordHash = await bcrypt.hash("password123", 10);

  const owner = await prisma.user.create({
    data: {
      organizationId: org.id,
      name: "Olivia Owner",
      email: "owner@riverside.test",
      passwordHash,
      role: "OWNER",
    },
  });

  const alice = await prisma.user.create({
    data: {
      organizationId: org.id,
      name: "Alice Johnson",
      email: "alice@riverside.test",
      passwordHash,
      role: "FIELD_TECH",
    },
  });

  const bob = await prisma.user.create({
    data: {
      organizationId: org.id,
      name: "Bob Martinez",
      email: "bob@riverside.test",
      passwordHash,
      role: "FIELD_TECH",
    },
  });

  const customer = await prisma.customer.create({
    data: {
      organizationId: org.id,
      name: "Riverside Apartments",
      address: "123 River Rd",
      phone: "555-0200",
    },
  });

  const project = await prisma.project.create({
    data: {
      organizationId: org.id,
      title: "Fix breaker panel",
      description: "Replace faulty breaker in unit 4B",
      address: "123 River Rd, Unit 4B",
      status: "SCHEDULED",
      customerId: customer.id,
      createdByUserId: owner.id,
      members: { create: [{ userId: alice.id, role: "LEAD" }] },
      tasks: {
        create: [
          { title: "Order replacement breaker", assigneeUserId: alice.id },
          { title: "Schedule shutoff with building manager", assigneeUserId: bob.id },
        ],
      },
    },
  });

  await prisma.activityLog.create({
    data: {
      organizationId: org.id,
      projectId: project.id,
      actorUserId: owner.id,
      action: "project.created",
      summary: "Olivia Owner created project \"Fix breaker panel\"",
    },
  });

  const lead = await prisma.lead.create({
    data: {
      organizationId: org.id,
      name: "Maple Street Duplex",
      contactName: "Jamie Lee",
      phone: "555-0300",
      source: "Referral",
      status: "QUALIFIED",
    },
  });

  await prisma.estimate.create({
    data: {
      organizationId: org.id,
      leadId: lead.id,
      title: "Estimate for Maple Street Duplex",
      status: "SENT",
      lineItems: {
        create: [
          { description: "Panel inspection", quantity: 1, unitPrice: 150, position: 1 },
          { description: "Breaker replacement", quantity: 2, unitPrice: 85, position: 2 },
        ],
      },
    },
  });

  console.log("Seeded org 'riverside'. Login as owner@riverside.test / password123");
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
