/**
 * Seeds a large, realistic-looking demo company for sales demos: a mid-size
 * general contractor with a full org chart, a customer base, an active
 * project pipeline (mid-progress, overdue, and completed work), and a lead
 * -> estimate -> project pipeline. Coexists with the small `seed.ts` fixture
 * — this creates its own organization, so run both against the same DB.
 *
 * Usage: npm run db:seed:demo
 */
import { PrismaClient, type Role, type ProjectStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { uploadObject } from "@/lib/storage";

const prisma = new PrismaClient();

const ORG_NAME = "Sterling Build & Renovate";
const ORG_SLUG = "sterling-demo";
const EMAIL_DOMAIN = "sterlingdemo.test";
const DEMO_PASSWORD = "password123";

// ---------- small deterministic-ish random helpers (no faker dependency) ----------

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

function slugifyEmail(name: string, suffix: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
    .split(/\s+/)
    .join(".");
  return `${base}${suffix}@${EMAIL_DOMAIN}`;
}

// ---------- name / data pools ----------

const FIRST_NAMES = [
  "Marcus", "Elena", "James", "Sofia", "David", "Maria", "Robert", "Ashley",
  "Michael", "Jasmine", "Carlos", "Rachel", "Anthony", "Priya", "Daniel",
  "Megan", "Kevin", "Natalie", "Brian", "Courtney", "Jason", "Vanessa",
  "Eric", "Danielle", "Tyler", "Brianna", "Andre", "Kayla", "Wesley", "Grace",
  "Omar", "Chloe", "Derek", "Samantha", "Lucas", "Isabella", "Nathan", "Olivia",
  "Trevor", "Amanda", "Julian", "Victoria", "Curtis", "Hannah", "Malik", "Erin",
  "Shane", "Paige", "Dominic", "Leah",
];

const LAST_NAMES = [
  "Sterling", "Reyes", "Whitfield", "Nguyen", "Carter", "Delgado", "Brooks",
  "Kowalski", "Patel", "Osei", "Fitzgerald", "Moreno", "Blackwood", "Chen",
  "Mercer", "Alvarez", "Donovan", "Kim", "Hendricks", "Salazar", "Bowen",
  "Freeman", "Castillo", "Whitaker", "Novak", "Grant", "Espinoza", "Holt",
  "Vasquez", "Bishop", "Larsen", "Ferreira", "Combs", "Okafor", "Pruitt",
];

const COMPANY_SUFFIXES = ["Properties", "Holdings", "Realty Group", "Management", "Partners", "LLC"];
const COMPANY_STEMS = [
  "Riverbend", "Oakwood", "Cedar Ridge", "Lakeside", "Northgate", "Brightwater",
  "Summit", "Harborview", "Millstone", "Fairhaven", "Greenfield", "Stonebridge",
];

const STREET_NAMES = [
  "Maple", "Oak", "Cedar", "Birch", "Willow", "Elm", "Sycamore", "Magnolia",
  "Pecan", "Live Oak", "Congress", "Lamar", "Manchaca", "Slaughter", "Parmer",
  "Burnet", "Airport", "Riverside", "Bluebonnet", "Barton Springs",
];

const PROJECT_TITLES = [
  "Kitchen remodel", "Primary bath renovation", "Roof replacement",
  "HVAC system install", "Deck build", "Fence replacement",
  "Water heater replacement", "Whole-home rewire", "Foundation repair",
  "Window replacement", "Siding replacement", "Garage conversion",
  "Basement finish-out", "Sunroom addition", "Driveway repaving",
  "Gutter replacement", "Attic insulation upgrade", "Panel upgrade to 200A",
  "Interior repaint", "Flooring replacement", "Pool deck resurfacing",
  "Exterior repaint", "Chimney repair", "Pergola install",
  "Storm damage repair",
];

const LEAD_SOURCES = ["Referral", "Google", "Angi", "Yelp", "Repeat customer", "Trade show", "Facebook ad"];

const NOTES_SNIPPETS = [
  "Customer flexible on start date.",
  "Needs permit before work begins.",
  "Tenant occupied — coordinate access with property manager.",
  "Material on backorder, monitoring lead time.",
  "Customer requested weekly photo updates.",
  "Second opinion requested before approving scope change.",
];

function randomPersonName(): string {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}

function randomCustomerName(): string {
  if (Math.random() < 0.3) {
    return `${pick(COMPANY_STEMS)} ${pick(COMPANY_SUFFIXES)}`;
  }
  return randomPersonName();
}

function randomAddress(): string {
  return `${randInt(100, 9999)} ${pick(STREET_NAMES)} ${pick(["St", "Ave", "Dr", "Ln", "Rd", "Way"])}, Austin, TX ${randInt(78701, 78759)}`;
}

// ---------- 1x1 PNG + minimal text "document" bytes for real R2 uploads ----------

const PLACEHOLDER_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);
const PLACEHOLDER_TEXT = Buffer.from(
  "Demo document placeholder — Sterling Build & Renovate\nThis is seeded demo content, not a real project document.\n"
);

async function main() {
  const existing = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  if (existing) {
    console.error(
      `Organization "${ORG_SLUG}" already exists (id ${existing.id}). Refusing to re-seed — ` +
        `drop it first if you want a fresh demo company.`
    );
    process.exit(1);
  }

  const r2Configured = Boolean(
    process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY
  );
  if (!r2Configured) {
    console.log(
      "R2 env vars not set — skipping attachment seeding (project counts/tasks/schedule are unaffected). " +
        "Re-run after configuring R2_* to also populate the Files tab with real uploaded placeholders."
    );
  }

  const org = await prisma.organization.create({ data: { name: ORG_NAME, slug: ORG_SLUG } });
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // ---------- users: 1 owner, 1 admin, 5 PMs, 8 sales reps, 15 field crew ----------

  const usedEmails = new Set<string>();
  function makeUser(name: string, role: Role) {
    let email = slugifyEmail(name, "");
    let n = 2;
    while (usedEmails.has(email)) {
      email = slugifyEmail(name, String(n++));
    }
    usedEmails.add(email);
    return { name, email, role };
  }

  const ownerName = randomPersonName();
  const ownerSpec = { name: ownerName, email: `owner@${EMAIL_DOMAIN}`, role: "OWNER" as Role };
  usedEmails.add(ownerSpec.email);

  const adminSpec = makeUser(randomPersonName(), "ADMIN");
  const pmSpecs = Array.from({ length: 5 }, () => makeUser(randomPersonName(), "PROJECT_MANAGER"));
  const salesSpecs = Array.from({ length: 8 }, () => makeUser(randomPersonName(), "SALES"));
  const fieldSpecs = Array.from({ length: 15 }, () => makeUser(randomPersonName(), "FIELD_TECH"));

  const allSpecs = [ownerSpec, adminSpec, ...pmSpecs, ...salesSpecs, ...fieldSpecs];
  const createdUsers = [];
  for (const spec of allSpecs) {
    createdUsers.push(
      await prisma.user.create({
        data: { organizationId: org.id, name: spec.name, email: spec.email, passwordHash, role: spec.role },
      })
    );
  }
  const owner = createdUsers[0];
  const pms = createdUsers.slice(2, 7);
  const sales = createdUsers.slice(7, 15);
  const field = createdUsers.slice(15, 30);

  console.log(`Created ${createdUsers.length} users.`);

  // ---------- customers ----------

  const customers = [];
  for (let i = 0; i < 40; i++) {
    const name = randomCustomerName();
    customers.push(
      await prisma.customer.create({
        data: {
          organizationId: org.id,
          name,
          phone: `512-555-${String(randInt(1000, 9999))}`,
          email: name.includes(" ") && !COMPANY_SUFFIXES.some((s) => name.includes(s))
            ? slugifyEmail(name, "").replace(EMAIL_DOMAIN, "customer.test")
            : undefined,
          address: randomAddress(),
        },
      })
    );
  }
  console.log(`Created ${customers.length} customers.`);

  // ---------- leads + estimates (some convert to projects) ----------

  const leadStatuses: Array<"NEW" | "CONTACTED" | "QUALIFIED" | "WON" | "LOST"> = [
    "NEW", "NEW", "CONTACTED", "CONTACTED", "QUALIFIED", "WON", "WON", "WON", "LOST",
  ];
  const wonEstimateProjectSources: { leadId: string; estimateId: string; customerId: string; title: string }[] = [];

  for (let i = 0; i < 18; i++) {
    const status = pick(leadStatuses);
    const customer = pick(customers);
    const rep = pick(sales);
    const lead = await prisma.lead.create({
      data: {
        organizationId: org.id,
        name: `${customer.name} — ${pick(PROJECT_TITLES)}`,
        contactName: customer.name,
        phone: customer.phone,
        email: customer.email,
        source: pick(LEAD_SOURCES),
        status,
        customerId: customer.id,
        notes: Math.random() < 0.4 ? pick(NOTES_SNIPPETS) : undefined,
        createdAt: daysFromNow(-randInt(3, 75)),
      },
    });

    if (status === "WON" || status === "QUALIFIED" || Math.random() < 0.5) {
      const estimateStatus =
        status === "WON" ? "APPROVED" : pick(["DRAFT", "SENT", "SENT", "REJECTED"] as const);
      const estimate = await prisma.estimate.create({
        data: {
          organizationId: org.id,
          leadId: lead.id,
          customerId: customer.id,
          title: `Estimate — ${lead.name}`,
          status: estimateStatus,
          notes: `Prepared by ${rep.name}`,
          lineItems: {
            create: Array.from({ length: randInt(2, 4) }, (_, idx) => ({
              description: pick([
                "Labor", "Materials", "Permit fee", "Site prep", "Demo & haul-away",
                "Fixtures", "Equipment rental", "Finish work",
              ]),
              quantity: randInt(1, 5),
              unitPrice: randInt(75, 900),
              position: idx,
            })),
          },
        },
      });

      if (status === "WON" && estimateStatus === "APPROVED") {
        wonEstimateProjectSources.push({
          leadId: lead.id,
          estimateId: estimate.id,
          customerId: customer.id,
          title: lead.name,
        });
      }
    }
  }
  console.log(`Created 18 leads with estimates (${wonEstimateProjectSources.length} won -> converting to projects).`);

  // ---------- projects: 25 total, realistic status spread ----------

  type ProjectPlan = { status: ProjectStatus; overdue: boolean };
  const plans: ProjectPlan[] = [
    ...Array.from({ length: 6 }, () => ({ status: "COMPLETED" as ProjectStatus, overdue: false })),
    ...Array.from({ length: 10 }, (_, i) => ({ status: "IN_PROGRESS" as ProjectStatus, overdue: i < 4 })),
    ...Array.from({ length: 5 }, (_, i) => ({ status: "SCHEDULED" as ProjectStatus, overdue: i < 1 })),
    ...Array.from({ length: 2 }, () => ({ status: "ON_HOLD" as ProjectStatus, overdue: true })),
    ...Array.from({ length: 2 }, () => ({ status: "CANCELLED" as ProjectStatus, overdue: false })),
  ];

  const wonQueue = [...wonEstimateProjectSources];
  let activityCount = 0;

  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    const fromLead = wonQueue.pop();
    const customer = fromLead ? customers.find((c) => c.id === fromLead.customerId)! : pick(customers);
    const title = fromLead ? fromLead.title.split(" — ")[1] ?? pick(PROJECT_TITLES) : pick(PROJECT_TITLES);
    const pm = pick(pms);
    const crew = pickN(field, randInt(1, 3));
    const createdAt = daysFromNow(-randInt(5, 90));
    const scheduledAt =
      plan.status === "COMPLETED"
        ? daysFromNow(-randInt(1, 40))
        : plan.status === "SCHEDULED"
          ? daysFromNow(randInt(1, 30))
          : daysFromNow(-randInt(0, 20));

    const project = await prisma.project.create({
      data: {
        organizationId: org.id,
        title,
        description: `${title} for ${customer.name}.`,
        status: plan.status,
        health: plan.overdue ? "AT_RISK" : "ON_TRACK",
        healthNote: plan.overdue ? "Behind schedule — see overdue tasks." : undefined,
        address: randomAddress(),
        scheduledAt,
        createdAt,
        customerId: customer.id,
        createdByUserId: pm.id,
        members: {
          create: [
            { userId: pm.id, role: "LEAD" },
            ...crew.map((u) => ({ userId: u.id, role: "MEMBER" as const })),
          ],
        },
      },
    });

    if (fromLead) {
      await prisma.estimate.update({
        where: { id: fromLead.estimateId },
        data: { projectId: project.id },
      });
      await prisma.activityLog.create({
        data: {
          organizationId: org.id,
          projectId: project.id,
          actorUserId: pm.id,
          action: "estimate.converted_to_project",
          summary: `${pm.name} converted an approved estimate into project "${title}"`,
          createdAt,
        },
      });
      activityCount++;
    }

    await prisma.activityLog.create({
      data: {
        organizationId: org.id,
        projectId: project.id,
        actorUserId: pm.id,
        action: "project.created",
        summary: `${pm.name} created project "${title}"`,
        createdAt,
      },
    });
    activityCount++;

    // tasks
    const taskCount = randInt(2, 5);
    const doneAll = plan.status === "COMPLETED";
    for (let t = 0; t < taskCount; t++) {
      const isLastTask = t === taskCount - 1;
      const status = doneAll
        ? "DONE"
        : plan.overdue && isLastTask
          ? pick(["TODO", "IN_PROGRESS"] as const)
          : pick(["TODO", "IN_PROGRESS", "DONE"] as const);
      const dueDate =
        plan.overdue && isLastTask
          ? daysFromNow(-randInt(2, 12))
          : doneAll
            ? daysFromNow(-randInt(1, 30))
            : daysFromNow(randInt(1, 21));
      await prisma.task.create({
        data: {
          projectId: project.id,
          title: pick([
            "Order materials", "Site walkthrough", "Schedule inspection", "Demo existing fixtures",
            "Rough-in work", "Finish work", "Final walkthrough with customer", "Cleanup & haul-away",
            "Confirm permit approval", "Coordinate utility shutoff",
          ]),
          assigneeUserId: pick([pm, ...crew]).id,
          status,
          dueDate,
          position: t,
        },
      });
    }

    // schedule entries for active/upcoming work
    if (plan.status === "IN_PROGRESS" || plan.status === "SCHEDULED") {
      for (const tech of crew) {
        const start = plan.status === "SCHEDULED" ? daysFromNow(randInt(1, 25)) : daysFromNow(-randInt(0, 5));
        const end = new Date(start.getTime() + randInt(2, 8) * 60 * 60 * 1000);
        await prisma.scheduleEntry.create({
          data: { organizationId: org.id, projectId: project.id, userId: tech.id, startAt: start, endAt: end },
        });
      }
    }

    // completion activity
    if (plan.status === "COMPLETED") {
      await prisma.activityLog.create({
        data: {
          organizationId: org.id,
          projectId: project.id,
          actorUserId: pm.id,
          action: "project.status_changed",
          summary: `${pm.name} marked "${title}" as completed`,
          createdAt: scheduledAt,
        },
      });
      activityCount++;
    }

    // attachments, only if R2 is actually configured (see check above)
    if (r2Configured && Math.random() < 0.6) {
      const attachmentCount = randInt(1, 3);
      for (let a = 0; a < attachmentCount; a++) {
        const isPhoto = Math.random() < 0.7;
        const key = `${org.id}/${project.id}/demo-${project.id}-${a}${isPhoto ? ".png" : ".txt"}`;
        await uploadObject(key, isPhoto ? PLACEHOLDER_PNG : PLACEHOLDER_TEXT, isPhoto ? "image/png" : "text/plain");
        await prisma.attachment.create({
          data: {
            organizationId: org.id,
            projectId: project.id,
            uploadedByUserId: pick([pm, ...crew]).id,
            filename: isPhoto ? `jobsite-photo-${a + 1}.png` : `notes-${a + 1}.txt`,
            storagePath: key,
            contentType: isPhoto ? "image/png" : "text/plain",
            size: isPhoto ? PLACEHOLDER_PNG.length : PLACEHOLDER_TEXT.length,
            kind: isPhoto ? "PHOTO" : "DOCUMENT",
          },
        });
      }
    }
  }
  console.log(`Created ${plans.length} projects with tasks and schedule entries.`);
  console.log(`Logged ${activityCount} activity entries directly; more accrue implicitly via app usage.`);

  console.log("\nDemo company ready.");
  console.log(`Org: ${ORG_NAME} (slug: ${ORG_SLUG})`);
  console.log(`Log in as owner: ${ownerSpec.email} / ${DEMO_PASSWORD}`);
  console.log(`(All ${createdUsers.length} seeded users share the same password: ${DEMO_PASSWORD})`);
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
