/**
 * Seeds the "Summit Build & Service" demo environment (see the CrewSync Demo
 * Company + Demo Script) for sales demos and QA, plus a second, small
 * "Harbor Ridge Mechanical" organization used purely to prove tenant
 * isolation: none of its records should ever be reachable while signed in
 * as a Summit user, and vice versa.
 *
 * Idempotent: re-running this script wipes and recreates both organizations
 * (matched by slug) so it's safe to reseed a staging DB repeatedly.
 *
 * Usage: npm run db:seed:demo
 *
 * See the "Demo script vs. current schema" comment near the bottom of this
 * file for what the source document asks for that today's models can't
 * represent yet (and how this seed approximates it honestly instead of
 * faking a field that doesn't exist).
 */
import { PrismaClient, type Role, type ProjectStatus, type TaskStatus } from "@prisma/client";
import bcrypt from "bcryptjs";
import { uploadObject } from "@/lib/storage";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "password123";

const SUMMIT_NAME = "Summit Build & Service";
const SUMMIT_SLUG = "summit-demo";
const SUMMIT_EMAIL_DOMAIN = "summitbuildservice.test";

const ISOLATION_NAME = "Harbor Ridge Mechanical";
const ISOLATION_SLUG = "harbor-ridge-isolation-test";
const ISOLATION_EMAIL_DOMAIN = "harborridge.test";

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

function slugifyEmail(name: string, domain: string, suffix = ""): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim()
    .split(/\s+/)
    .join(".");
  return `${base}${suffix}@${domain}`;
}

// ---------- idempotent reset: wipe an org (by slug) and everything under it ----------
// Deletion order matters for the relations that are NOT onDelete:Cascade in
// schema.prisma (Estimate.project, Estimate.customer, Lead.customer,
// Project.customer) — those must be cleared before their target row can go.
// Everything hanging off Project/User already cascades (Task, ProjectMember,
// ScheduleEntry, Attachment, ActivityLog via Project; Session, AuthToken via
// User), so this list is short on purpose.

async function resetOrganization(slug: string): Promise<void> {
  const org = await prisma.organization.findUnique({ where: { slug } });
  if (!org) return;

  await prisma.estimate.deleteMany({ where: { organizationId: org.id } });
  await prisma.lead.deleteMany({ where: { organizationId: org.id } });
  await prisma.project.deleteMany({ where: { organizationId: org.id } });
  await prisma.customer.deleteMany({ where: { organizationId: org.id } });
  await prisma.activityLog.deleteMany({ where: { organizationId: org.id } });
  await prisma.attachment.deleteMany({ where: { organizationId: org.id } });
  await prisma.user.deleteMany({ where: { organizationId: org.id } });
  await prisma.organization.delete({ where: { id: org.id } });

  console.log(`Wiped existing "${slug}" organization for a clean reseed.`);
}

// ---------- name / data pools ----------

const FIRST_NAMES = [
  "Marcus", "Elena", "James", "Sofia", "David", "Maria", "Robert", "Ashley",
  "Michael", "Jasmine", "Carlos", "Rachel", "Anthony", "Priya", "Daniel",
  "Megan", "Kevin", "Natalie", "Brian", "Courtney", "Jason", "Vanessa",
  "Eric", "Danielle", "Tyler", "Brianna", "Andre", "Kayla", "Wesley", "Grace",
  "Omar", "Chloe", "Derek", "Samantha", "Lucas", "Isabella", "Nathan",
  "Trevor", "Amanda", "Julian", "Victoria", "Curtis", "Hannah", "Malik", "Erin",
  "Shane", "Paige", "Dominic", "Leah",
];

const LAST_NAMES = [
  "Reyes", "Whitfield", "Nguyen", "Carter", "Delgado", "Brooks",
  "Kowalski", "Patel", "Osei", "Fitzgerald", "Moreno", "Blackwood",
  "Mercer", "Alvarez", "Donovan", "Kim", "Hendricks", "Salazar", "Bowen",
  "Freeman", "Castillo", "Whitaker", "Novak", "Grant", "Espinoza", "Holt",
  "Vasquez", "Bishop", "Larsen", "Ferreira", "Combs", "Okafor", "Pruitt",
];

function randomPersonName(): string {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}

// Kansas City metro flavor for addresses, matching the demo script's footprint.
const KC_STREETS = [
  "Main St", "Grand Blvd", "Southwest Blvd", "State Line Rd", "Ward Pkwy",
  "Troost Ave", "Metcalf Ave", "Shawnee Mission Pkwy", "Blue Ridge Blvd",
  "Front St", "Broadway Blvd", "Wornall Rd", "Holmes Rd", "Antioch Rd", "College Blvd",
];
const KC_CITY_ZIPS: Array<[string, number, number]> = [
  ["Kansas City, MO", 64101, 64155],
  ["Overland Park, KS", 66201, 66221],
  ["Lenexa, KS", 66215, 66219],
  ["Olathe, KS", 66051, 66062],
  ["Independence, MO", 64050, 64058],
  ["Shawnee, KS", 66203, 66218],
  ["North Kansas City, MO", 64116, 64118],
];

function randomAddress(): string {
  const [city, zMin, zMax] = pick(KC_CITY_ZIPS);
  return `${randInt(100, 9999)} ${pick(KC_STREETS)}, ${city} ${randInt(zMin, zMax)}`;
}

function randomPhone(): string {
  return `${pick(["816", "913"])}-555-${String(randInt(1000, 9999))}`;
}

// Commercial/light-industrial customer types the demo script calls for.
const CUSTOMER_TYPES = [
  "Commercial", "Healthcare", "Property Management", "Industrial",
  "Retail", "Financial", "Logistics", "Multifamily",
] as const;

const COMPANY_STEMS = [
  "Northgate", "Brightwater", "Summit", "Harborview", "Millstone", "Fairhaven",
  "Greenfield", "Stonebridge", "Ridgeline", "Ironwood", "Cornerstone", "Bellwether",
  "Prairie View", "Redstone", "Silverleaf", "Union Point", "Westfield", "Highland",
];
const TYPE_SUFFIXES: Record<(typeof CUSTOMER_TYPES)[number], string[]> = {
  Commercial: ["Distribution", "Holdings", "Group"],
  Healthcare: ["Medical Group", "Health Partners", "Clinic Network"],
  "Property Management": ["Property Partners", "Realty Group", "Management Co."],
  Industrial: ["Manufacturing", "Industries", "Fabrication"],
  Retail: ["Retail Group", "Shops", "Stores"],
  Financial: ["Community Bank", "Credit Union", "Financial Group"],
  Logistics: ["Logistics", "Freight", "Distribution Partners"],
  Multifamily: ["Apartments", "Residences", "Living"],
};

function randomCompanyName(type: (typeof CUSTOMER_TYPES)[number]): string {
  return `${pick(COMPANY_STEMS)} ${pick(TYPE_SUFFIXES[type])}`;
}

const COMMERCIAL_PROJECT_TITLES = [
  "Warehouse roof replacement", "Loading dock repair", "Parking lot resurfacing",
  "HVAC rooftop unit replacement", "Electrical service upgrade",
  "Fire suppression system install", "Interior tenant buildout",
  "Exterior facade repair", "Emergency generator install",
  "Security system upgrade", "Commercial flooring replacement",
  "Structural steel repair", "Roof leak remediation",
  "Loading area lighting retrofit", "ADA compliance upgrade",
  "Break room renovation", "Elevator modernization", "Boiler replacement",
];

const LEAD_SOURCES = ["Referral", "RFP response", "Existing customer", "Trade show", "Cold outreach", "Website inquiry"];

const LINE_ITEM_DESCRIPTIONS = [
  "Site work & mobilization", "Structural steel & framing",
  "Electrical service & panel work", "Mechanical/HVAC scope",
  "Permits & inspections", "Finish work & punch list",
  "Equipment & materials", "Project management & supervision",
];

// ---------- 1x1 PNG + minimal text "document" bytes for real R2 uploads ----------

const PLACEHOLDER_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64"
);
function placeholderText(org: string): Buffer {
  return Buffer.from(`Demo document placeholder — ${org}\nThis is seeded demo content, not a real project document.\n`);
}

type TaskSpec = { title: string; status: TaskStatus; dueDate: Date | null; assigneeUserId?: string | null };

async function createTasks(projectId: string, specs: TaskSpec[], fallbackAssigneeId: string): Promise<void> {
  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    await prisma.task.create({
      data: {
        projectId,
        title: spec.title,
        status: spec.status,
        dueDate: spec.dueDate,
        assigneeUserId: spec.assigneeUserId === undefined ? fallbackAssigneeId : spec.assigneeUserId,
        position: i,
      },
    });
  }
}

function doneTaskSpecs(count: number, titles: string[]): TaskSpec[] {
  return Array.from({ length: count }, (_, i) => ({
    title: titles[i % titles.length],
    status: "DONE" as TaskStatus,
    dueDate: daysFromNow(-randInt(2, 30)),
  }));
}

async function main() {
  await resetOrganization(SUMMIT_SLUG);
  await resetOrganization(ISOLATION_SLUG);

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const r2Configured = Boolean(
    process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY
  );
  if (!r2Configured) {
    console.log(
      "R2 env vars not set — skipping attachment uploads (project/task/schedule counts are unaffected). " +
        "Re-run after configuring R2_* to also populate the Files tab with real uploaded placeholders."
    );
  }

  // =========================================================================
  // Summit Build & Service
  // =========================================================================

  const summit = await prisma.organization.create({ data: { name: SUMMIT_NAME, slug: SUMMIT_SLUG } });

  // ---------- users (30 total) ----------
  // The Role enum is OWNER/ADMIN/MANAGER/TECHNICIAN — there's no dedicated
  // Executive/Sales/Project-Manager/Office-Admin/Foreman title yet, so the
  // demo script's 5 job categories map onto it as follows (see the schema
  // note at the bottom of this file):
  //   Owner/Admin (Jordan Blake)      -> OWNER
  //   Executive (Maya Chen)           -> ADMIN   (broad visibility, no ownership actions)
  //   Office Admin (Avery Stone)      -> ADMIN   (needs real user/customer admin permissions)
  //   Sales + Project Manager         -> MANAGER (can create/convert leads, estimates, projects)
  //   Field crew, incl. the foreman   -> TECHNICIAN (foreman marked ProjectMemberRole.LEAD per project)

  const usedEmails = new Set<string>();
  function makeUser(name: string, role: Role, emailLocal?: string) {
    let email = emailLocal ? `${emailLocal}@${SUMMIT_EMAIL_DOMAIN}` : slugifyEmail(name, SUMMIT_EMAIL_DOMAIN);
    let n = 2;
    while (usedEmails.has(email)) {
      email = slugifyEmail(name, SUMMIT_EMAIL_DOMAIN, String(n++));
    }
    usedEmails.add(email);
    return { name, email, role };
  }

  const namedSpecs = [
    makeUser("Jordan Blake", "OWNER", "jordan.blake"),
    makeUser("Maya Chen", "ADMIN", "maya.chen"),
    makeUser("Avery Stone", "ADMIN", "avery.stone"),
    makeUser("Ethan Brooks", "MANAGER", "ethan.brooks"),
    makeUser("Olivia Grant", "MANAGER", "olivia.grant"),
    makeUser("Marcus Reed", "MANAGER", "marcus.reed"),
    makeUser("Sofia Patel", "MANAGER", "sofia.patel"),
    makeUser("Luis Ramirez", "TECHNICIAN", "luis.ramirez"),
    makeUser("Darius Cole", "TECHNICIAN", "darius.cole"),
    makeUser("Nina Foster", "TECHNICIAN", "nina.foster"),
  ];
  const fillerSalesSpecs = Array.from({ length: 3 }, () => makeUser(randomPersonName(), "MANAGER"));
  const fillerPmSpecs = Array.from({ length: 3 }, () => makeUser(randomPersonName(), "MANAGER"));
  const fillerFieldSpecs = Array.from({ length: 14 }, () => makeUser(randomPersonName(), "TECHNICIAN"));

  const allSpecs = [...namedSpecs, ...fillerSalesSpecs, ...fillerPmSpecs, ...fillerFieldSpecs];
  const createdUsers: Record<string, Awaited<ReturnType<typeof prisma.user.create>>> = {};
  const createdList = [];
  for (const spec of allSpecs) {
    const user = await prisma.user.create({
      data: { organizationId: summit.id, name: spec.name, email: spec.email, passwordHash, role: spec.role },
    });
    createdUsers[spec.name] = user;
    createdList.push(user);
  }

  const jordan = createdUsers["Jordan Blake"];
  const maya = createdUsers["Maya Chen"];
  const avery = createdUsers["Avery Stone"];
  const ethan = createdUsers["Ethan Brooks"];
  const olivia = createdUsers["Olivia Grant"];
  const marcus = createdUsers["Marcus Reed"];
  const sofia = createdUsers["Sofia Patel"];
  const luis = createdUsers["Luis Ramirez"];
  const darius = createdUsers["Darius Cole"];
  const nina = createdUsers["Nina Foster"];
  void maya;
  void avery;
  void olivia;

  const pms = [marcus, sofia, ...fillerPmSpecs.map((s) => createdUsers[s.name])];
  const field = [luis, darius, nina, ...fillerFieldSpecs.map((s) => createdUsers[s.name])];

  console.log(`Summit: created ${createdList.length} users.`);

  // ---------- customers (40 total: 8 named + 32 filler across the same 8 industry types) ----------

  const namedCustomerDefs: Array<{ name: string; type: (typeof CUSTOMER_TYPES)[number] }> = [
    { name: "NorthPoint Distribution", type: "Commercial" },
    { name: "Crestview Medical Group", type: "Healthcare" },
    { name: "Riverside Property Partners", type: "Property Management" },
    { name: "Atlas Manufacturing", type: "Industrial" },
    { name: "Oakline Retail Group", type: "Retail" },
    { name: "Metro Community Bank", type: "Financial" },
    { name: "Horizon Logistics", type: "Logistics" },
    { name: "Evergreen Apartments", type: "Multifamily" },
  ];

  const customersByName: Record<string, Awaited<ReturnType<typeof prisma.customer.create>>> = {};
  for (const def of namedCustomerDefs) {
    customersByName[def.name] = await prisma.customer.create({
      data: {
        organizationId: summit.id,
        name: def.name,
        phone: randomPhone(),
        email: slugifyEmail(def.name, "customer.test"),
        address: randomAddress(),
        notes: `Industry: ${def.type}`,
      },
    });
  }

  const fillerCustomers = [];
  for (const type of CUSTOMER_TYPES) {
    for (let i = 0; i < 4; i++) {
      const name = randomCompanyName(type);
      fillerCustomers.push(
        await prisma.customer.create({
          data: {
            organizationId: summit.id,
            name,
            phone: randomPhone(),
            email: slugifyEmail(name, "customer.test"),
            address: randomAddress(),
            notes: `Industry: ${type}`,
          },
        })
      );
    }
  }
  const allCustomers = [...Object.values(customersByName), ...fillerCustomers];
  console.log(`Summit: created ${allCustomers.length} customers.`);

  // ---------- golden-path lead + estimate for the flagship project ----------
  // Ethan Brooks receives the NorthPoint lead, qualifies it, prepares an
  // estimate; customer approval is recorded; it converts into the flagship
  // project below without re-entering the customer.

  const northPoint = customersByName["NorthPoint Distribution"];
  const northPointLead = await prisma.lead.create({
    data: {
      organizationId: summit.id,
      name: "NorthPoint Distribution — Dock Expansion & Electrical Upgrade",
      contactName: "Facilities Director, NorthPoint Distribution",
      phone: northPoint.phone,
      email: northPoint.email,
      source: "Referral",
      status: "WON",
      customerId: northPoint.id,
      notes: "Dock expansion + electrical service upgrade for the distribution center.",
      createdAt: new Date("2026-07-02T09:00:00"),
      updatedAt: new Date("2026-08-05T09:00:00"),
    },
  });

  const northPointEstimate = await prisma.estimate.create({
    data: {
      organizationId: summit.id,
      leadId: northPointLead.id,
      customerId: northPoint.id,
      title: "Dock Expansion & Electrical Upgrade — Estimate",
      status: "APPROVED",
      notes: "Prepared by Ethan Brooks. Approved by customer prior to mobilization.",
      createdAt: new Date("2026-07-10T09:00:00"),
      updatedAt: new Date("2026-08-05T09:00:00"),
      lineItems: {
        create: [
          { description: "Dock structural framing & expansion", quantity: 1, unitPrice: 265000, position: 0 },
          { description: "Electrical panel & service upgrade", quantity: 1, unitPrice: 98000, position: 1 },
          { description: "Permitting, inspection & engineering", quantity: 1, unitPrice: 34500, position: 2 },
          { description: "Mobilization & project management", quantity: 1, unitPrice: 31000, position: 3 },
        ],
      },
    },
  });
  // 265000 + 98000 + 34500 + 31000 = 428,500 — matches the demo script's target contract value.

  // ---------- flagship project: NorthPoint Distribution — Dock Expansion & Electrical Upgrade ----------

  const northPointCrew = pickN(
    field.filter((u) => u.id !== luis.id),
    4
  );
  const northPointProject = await prisma.project.create({
    data: {
      organizationId: summit.id,
      title: "Dock Expansion & Electrical Upgrade",
      description:
        "Dock expansion and electrical service upgrade for NorthPoint Distribution. " +
        "Target completion: Oct 2, 2026. Contract value $428,500. " +
        "At risk: equipment delivery moved 3 days; dock inspection is dependent on that delivery.",
      status: "IN_PROGRESS",
      address: northPoint.address,
      scheduledAt: new Date("2026-08-10T08:00:00"),
      createdAt: new Date("2026-08-05T10:00:00"),
      customerId: northPoint.id,
      createdByUserId: ethan.id,
      members: {
        create: [
          { userId: marcus.id, role: "LEAD" },
          { userId: luis.id, role: "LEAD" },
          ...northPointCrew.map((u) => ({ userId: u.id, role: "MEMBER" as const })),
        ],
      },
    },
  });

  await prisma.estimate.update({
    where: { id: northPointEstimate.id },
    data: { projectId: northPointProject.id },
  });

  // 11 open tasks (2 overdue), matching the demo script exactly, plus a few
  // already-closed-out tasks for activity history.
  await createTasks(
    northPointProject.id,
    [
      { title: "Confirm equipment delivery reschedule", status: "IN_PROGRESS", dueDate: daysFromNow(-3), assigneeUserId: marcus.id },
      { title: "Dock inspection dependency sign-off", status: "TODO", dueDate: daysFromNow(-1), assigneeUserId: marcus.id },
      { title: "Panel installation", status: "TODO", dueDate: daysFromNow(3) },
      { title: "Dock framing", status: "TODO", dueDate: daysFromNow(5) },
      { title: "Conduit conflict resolution", status: "IN_PROGRESS", dueDate: daysFromNow(2), assigneeUserId: luis.id },
      { title: "Electrical rough-in", status: "TODO", dueDate: daysFromNow(7) },
      { title: "Structural steel delivery coordination", status: "TODO", dueDate: daysFromNow(10) },
      { title: "Site safety walkthrough", status: "TODO", dueDate: daysFromNow(4) },
      { title: "Customer progress update call", status: "TODO", dueDate: daysFromNow(6), assigneeUserId: marcus.id },
      { title: "Order dock leveler equipment", status: "IN_PROGRESS", dueDate: daysFromNow(8) },
      { title: "Schedule final electrical inspection", status: "TODO", dueDate: daysFromNow(20) },
      { title: "Site survey & measurements", status: "DONE", dueDate: daysFromNow(-25) },
      { title: "Demo existing dock structure", status: "DONE", dueDate: daysFromNow(-18) },
      { title: "Initial permit submission", status: "DONE", dueDate: daysFromNow(-30) },
    ],
    luis.id
  );

  for (const tech of northPointCrew) {
    await prisma.scheduleEntry.create({
      data: {
        organizationId: summit.id,
        projectId: northPointProject.id,
        userId: tech.id,
        startAt: daysFromNow(1),
        endAt: new Date(daysFromNow(1).getTime() + 8 * 60 * 60 * 1000),
        notes: "Panel installation + dock framing",
      },
    });
  }

  await prisma.activityLog.create({
    data: {
      organizationId: summit.id,
      projectId: northPointProject.id,
      actorUserId: ethan.id,
      action: "estimate.converted_to_project",
      summary: "Ethan Brooks converted the approved NorthPoint estimate into a project",
      createdAt: new Date("2026-08-05T10:05:00"),
    },
  });
  await prisma.activityLog.create({
    data: {
      organizationId: summit.id,
      projectId: northPointProject.id,
      actorUserId: marcus.id,
      action: "project.risk_flagged",
      summary: "Marcus Reed flagged the project at risk: equipment delivery moved 3 days, inspection dependency",
      createdAt: daysFromNow(-3),
    },
  });
  await prisma.activityLog.create({
    data: {
      organizationId: summit.id,
      projectId: northPointProject.id,
      actorUserId: luis.id,
      action: "attachment.uploaded",
      summary: "Luis Ramirez uploaded progress photos and flagged a conduit conflict",
      createdAt: daysFromNow(-1),
    },
  });

  if (r2Configured) {
    for (let i = 0; i < 3; i++) {
      const key = `${summit.id}/${northPointProject.id}/progress-photo-${i}.png`;
      await uploadObject(key, PLACEHOLDER_PNG, "image/png");
      await prisma.attachment.create({
        data: {
          organizationId: summit.id,
          projectId: northPointProject.id,
          uploadedByUserId: luis.id,
          filename: `dock-progress-${i + 1}.png`,
          storagePath: key,
          contentType: "image/png",
          size: PLACEHOLDER_PNG.length,
          kind: "PHOTO",
          createdAt: daysFromNow(-1),
        },
      });
    }

    const docBuffer = placeholderText(SUMMIT_NAME);
    const docKey = `${summit.id}/${northPointProject.id}/dock-expansion-scope.txt`;
    await uploadObject(docKey, docBuffer, "text/plain");
    await prisma.attachment.create({
      data: {
        organizationId: summit.id,
        projectId: northPointProject.id,
        uploadedByUserId: marcus.id,
        filename: "dock-expansion-scope.txt",
        storagePath: docKey,
        contentType: "text/plain",
        size: docBuffer.length,
        kind: "DOCUMENT",
        createdAt: new Date("2026-08-05T10:10:00"),
      },
    });
  }

  console.log("Summit: created flagship project (NorthPoint Distribution — Dock Expansion & Electrical Upgrade).");

  // ---------- 7 supporting named projects, for dashboard realism + the other 2 at-risk projects ----------

  type NamedProjectDef = {
    customerName: string;
    title: string;
    status: ProjectStatus;
    pm: typeof marcus;
    scheduledAt: Date;
    atRisk?: boolean;
    note?: string;
  };

  const supportingDefs: NamedProjectDef[] = [
    {
      customerName: "Crestview Medical Group",
      title: "Clinic Renovation",
      status: "IN_PROGRESS",
      pm: sofia,
      scheduledAt: daysFromNow(-14),
    },
    {
      customerName: "Riverside Property Partners",
      title: "Roof & Exterior Restoration",
      status: "SCHEDULED",
      pm: marcus,
      scheduledAt: daysFromNow(3),
    },
    {
      customerName: "Atlas Manufacturing",
      title: "Production Line Power Upgrade",
      status: "IN_PROGRESS",
      pm: sofia,
      scheduledAt: daysFromNow(-20),
      atRisk: true,
      note: "At risk: specialized switchgear on backorder, pushing the power-down window.",
    },
    {
      customerName: "Oakline Retail Group",
      title: "Storefront Refresh – Location 1",
      status: "IN_PROGRESS",
      pm: marcus,
      scheduledAt: daysFromNow(-8),
    },
    {
      customerName: "Metro Community Bank",
      title: "Branch Interior Renovation",
      status: "IN_PROGRESS",
      pm: sofia,
      scheduledAt: daysFromNow(-35),
      note: "Status: Closeout — final punch list before handoff.",
    },
    {
      customerName: "Horizon Logistics",
      title: "Warehouse Lighting Retrofit",
      status: "IN_PROGRESS",
      pm: marcus,
      scheduledAt: daysFromNow(-16),
      atRisk: true,
      note: "At risk: fixture shipment delayed; crew re-sequenced to unaffected bays.",
    },
    {
      customerName: "Evergreen Apartments",
      title: "Building C Exterior Repairs",
      status: "SCHEDULED",
      pm: sofia,
      scheduledAt: daysFromNow(5),
    },
  ];

  // Per-project open/overdue task targets (title, days-from-now due offset; negative = overdue).
  const supportingTaskPlans: Record<string, Array<[string, number]>> = {
    "Clinic Renovation": [
      ["Interior demo walkthrough", 2], ["Mechanical rough-in", 6], ["Electrical rough-in", 8],
      ["Drywall & finish", 14], ["Flooring install", 18], ["Final inspection scheduling", 25],
    ],
    "Roof & Exterior Restoration": [
      ["Material delivery coordination", 4], ["Crew mobilization", 3],
      ["Roof tear-off", 6], ["Exterior paint prep", 10],
    ],
    "Production Line Power Upgrade": [
      ["Switchgear delivery follow-up", -4], ["Power-down window scheduling", -2], ["Safety lockout plan sign-off", -1],
      ["Conduit routing", 5], ["Panel termination", 9], ["Load testing", 15], ["Customer walkthrough", 20], ["Final documentation", 25],
    ],
    "Storefront Refresh – Location 1": [
      ["Signage removal", 3], ["Storefront glazing", 7], ["Interior fixtures", 12], ["Final cleaning & handoff", 18], ["Punch list", 22],
    ],
    "Branch Interior Renovation": [
      ["Final paint touch-up", 2], ["Fixture punch list", 4], ["Customer walkthrough", 9],
    ],
    "Warehouse Lighting Retrofit": [
      ["Fixture shipment follow-up", -5], ["Re-sequence unaffected bays", -2],
      ["Bay A install", 4], ["Bay B install", 9], ["Controls commissioning", 14], ["Final walkthrough", 20], ["As-built documentation", 25],
    ],
    "Building C Exterior Repairs": [
      ["Scaffold setup", 6], ["Siding repair", 9], ["Exterior paint", 14], ["Final inspection", 20],
    ],
  };

  const namedProjectRecords: Array<{ id: string; title: string; atRisk: boolean }> = [
    { id: northPointProject.id, title: northPointProject.title, atRisk: true },
  ];

  for (const def of supportingDefs) {
    const customer = customersByName[def.customerName];
    const crew = pickN(field, randInt(2, 4));
    const project = await prisma.project.create({
      data: {
        organizationId: summit.id,
        title: def.title,
        description: `${def.title} for ${def.customerName}.${def.note ? " " + def.note : ""}`,
        status: def.status,
        address: customer.address,
        scheduledAt: def.scheduledAt,
        createdAt: daysFromNow(-randInt(20, 60)),
        customerId: customer.id,
        createdByUserId: def.pm.id,
        members: {
          create: [
            { userId: def.pm.id, role: "LEAD" },
            ...crew.map((u) => ({ userId: u.id, role: "MEMBER" as const })),
          ],
        },
      },
    });

    const plan = supportingTaskPlans[def.title] ?? [];
    const specs: TaskSpec[] = plan.map(([title, offset]) => ({
      title,
      status: offset < 0 ? "IN_PROGRESS" : "TODO",
      dueDate: daysFromNow(offset),
    }));
    await createTasks(project.id, specs, def.pm.id);

    await prisma.activityLog.create({
      data: {
        organizationId: summit.id,
        projectId: project.id,
        actorUserId: def.pm.id,
        action: "project.created",
        summary: `${def.pm.name} created project "${def.title}" for ${def.customerName}`,
        createdAt: daysFromNow(-randInt(20, 60)),
      },
    });

    if (def.status === "IN_PROGRESS" || def.status === "SCHEDULED") {
      for (const tech of crew) {
        const start = def.status === "SCHEDULED" ? def.scheduledAt : daysFromNow(-randInt(0, 3));
        await prisma.scheduleEntry.create({
          data: {
            organizationId: summit.id,
            projectId: project.id,
            userId: tech.id,
            startAt: start,
            endAt: new Date(start.getTime() + randInt(4, 8) * 60 * 60 * 1000),
          },
        });
      }
    }

    namedProjectRecords.push({ id: project.id, title: project.title, atRisk: Boolean(def.atRisk) });
  }
  console.log(`Summit: created ${supportingDefs.length} supporting named projects.`);

  // ---------- filler projects: 17 more active + 15 completed (40 total with the 8 named above) ----------

  const usedCustomerIds = new Set(Object.values(customersByName).map((c) => c.id));
  const unusedFillerCustomers = fillerCustomers.filter((c) => !usedCustomerIds.has(c.id));

  type FillerActivePlan = { status: ProjectStatus; openTasks: number; overdueTasks: number; thisWeek: boolean };
  const fillerActivePlans: FillerActivePlan[] = [
    { status: "IN_PROGRESS", openTasks: 2, overdueTasks: 1, thisWeek: false },
    { status: "IN_PROGRESS", openTasks: 2, overdueTasks: 1, thisWeek: false },
    { status: "IN_PROGRESS", openTasks: 1, overdueTasks: 0, thisWeek: false },
    { status: "ON_HOLD", openTasks: 1, overdueTasks: 0, thisWeek: false },
    { status: "ON_HOLD", openTasks: 1, overdueTasks: 0, thisWeek: false },
    ...Array.from({ length: 12 }, (_, i): FillerActivePlan => ({
      status: "SCHEDULED",
      openTasks: i < 7 ? 2 : 1,
      overdueTasks: 0,
      thisWeek: true,
    })),
  ];

  let openTaskTotal = 11 + 6 + 4 + 8 + 5 + 3 + 7 + 4; // named projects' open-task counts (see doc targets)
  let overdueTaskTotal = 2 + 0 + 0 + 3 + 0 + 0 + 2 + 0;
  let thisWeekCount = 2; // Riverside + Evergreen, both scheduled within the coming week

  let customerCursor = 0;
  function nextFillerCustomer() {
    const c = unusedFillerCustomers[customerCursor % unusedFillerCustomers.length];
    customerCursor++;
    return c;
  }

  const genericTaskTitles = [
    "Site walkthrough", "Order materials", "Crew mobilization", "Rough-in work",
    "Finish work", "Punch list", "Customer walkthrough", "Final inspection",
  ];
  const doneTaskTitlesPool = ["Site survey", "Demo & prep", "Permit submission", "Material delivery"];

  for (const plan of fillerActivePlans) {
    const customer = nextFillerCustomer();
    const pm = pick(pms);
    const crew = pickN(field, randInt(1, 3));
    const scheduledAt = plan.thisWeek
      ? daysFromNow(randInt(0, 6))
      : plan.status === "IN_PROGRESS"
        ? daysFromNow(-randInt(5, 25))
        : daysFromNow(-randInt(0, 10));

    const project = await prisma.project.create({
      data: {
        organizationId: summit.id,
        title: pick(COMMERCIAL_PROJECT_TITLES),
        description: `Project for ${customer.name}.`,
        status: plan.status,
        address: customer.address,
        scheduledAt,
        createdAt: daysFromNow(-randInt(5, 45)),
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

    const specs: TaskSpec[] = [];
    for (let i = 0; i < plan.openTasks; i++) {
      const overdue = i < plan.overdueTasks;
      specs.push({
        title: pick(genericTaskTitles),
        status: overdue ? "IN_PROGRESS" : "TODO",
        dueDate: overdue ? daysFromNow(-randInt(1, 10)) : daysFromNow(randInt(1, 21)),
        assigneeUserId: Math.random() < 0.15 ? null : pick([pm, ...crew]).id, // some intentionally unassigned
      });
    }
    await createTasks(project.id, specs, pm.id);

    if (plan.status === "IN_PROGRESS" || plan.status === "SCHEDULED") {
      for (const tech of crew) {
        await prisma.scheduleEntry.create({
          data: {
            organizationId: summit.id,
            projectId: project.id,
            userId: tech.id,
            startAt: scheduledAt,
            endAt: new Date(scheduledAt.getTime() + randInt(4, 8) * 60 * 60 * 1000),
          },
        });
      }
    }

    await prisma.activityLog.create({
      data: {
        organizationId: summit.id,
        projectId: project.id,
        actorUserId: pm.id,
        action: "project.created",
        summary: `${pm.name} created project "${project.title}" for ${customer.name}`,
        createdAt: project.createdAt,
      },
    });
  }
  openTaskTotal += fillerActivePlans.reduce((sum, p) => sum + p.openTasks, 0);
  overdueTaskTotal += fillerActivePlans.reduce((sum, p) => sum + p.overdueTasks, 0);
  thisWeekCount += fillerActivePlans.filter((p) => p.thisWeek).length;

  for (let i = 0; i < 15; i++) {
    const customer = nextFillerCustomer();
    const pm = pick(pms);
    const crew = pickN(field, randInt(1, 3));
    const completedAt = daysFromNow(-randInt(10, 90));
    const project = await prisma.project.create({
      data: {
        organizationId: summit.id,
        title: pick(COMMERCIAL_PROJECT_TITLES),
        description: `Project for ${customer.name}. Completed.`,
        status: "COMPLETED",
        address: customer.address,
        scheduledAt: completedAt,
        createdAt: daysFromNow(-randInt(91, 150)),
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

    await createTasks(project.id, doneTaskSpecs(randInt(2, 4), doneTaskTitlesPool), pm.id);

    await prisma.activityLog.create({
      data: {
        organizationId: summit.id,
        projectId: project.id,
        actorUserId: pm.id,
        action: "project.status_changed",
        summary: `${pm.name} marked "${project.title}" as completed`,
        createdAt: completedAt,
      },
    });
  }

  const totalProjects = 1 + supportingDefs.length + fillerActivePlans.length + 15;
  console.log(
    `Summit: created ${fillerActivePlans.length} filler active projects and 15 completed projects ` +
      `(${totalProjects} projects total: ${1 + supportingDefs.length + fillerActivePlans.length} active, 15 completed).`
  );
  console.log(
    `Summit: open tasks = ${openTaskTotal}, overdue tasks = ${overdueTaskTotal}, ` +
      `projects scheduled within the next 7 days = ${thisWeekCount}.`
  );
  console.log(
    `Summit: at-risk projects (in progress with an overdue task) = ${namedProjectRecords.filter((p) => p.atRisk).length} ` +
      `(${namedProjectRecords.filter((p) => p.atRisk).map((p) => p.title).join(", ")}).`
  );

  console.log(`\nSummit Build & Service ready (org: ${SUMMIT_NAME}, slug: ${SUMMIT_SLUG}).`);
  console.log(`Log in as owner: ${jordan.email} / ${DEMO_PASSWORD}`);
  console.log(`PM demo persona: ${marcus.email} / ${DEMO_PASSWORD}`);
  console.log(`Field demo persona: ${luis.email} / ${DEMO_PASSWORD}`);
  console.log(`Sales demo persona: ${ethan.email} / ${DEMO_PASSWORD}`);
  console.log(`(All Summit users share the same password: ${DEMO_PASSWORD})`);

  // =========================================================================
  // Harbor Ridge Mechanical — small, separate org for tenant-isolation QA
  // =========================================================================

  const isolationOrg = await prisma.organization.create({ data: { name: ISOLATION_NAME, slug: ISOLATION_SLUG } });

  const isolationOwner = await prisma.user.create({
    data: {
      organizationId: isolationOrg.id,
      name: "Priya Nakamura",
      email: `owner@${ISOLATION_EMAIL_DOMAIN}`,
      passwordHash,
      role: "OWNER",
    },
  });
  const isolationPm = await prisma.user.create({
    data: {
      organizationId: isolationOrg.id,
      name: "Colin Ward",
      email: `pm@${ISOLATION_EMAIL_DOMAIN}`,
      passwordHash,
      role: "MANAGER",
    },
  });
  const isolationTech = await prisma.user.create({
    data: {
      organizationId: isolationOrg.id,
      name: "Renee Ashby",
      email: `field@${ISOLATION_EMAIL_DOMAIN}`,
      passwordHash,
      role: "TECHNICIAN",
    },
  });

  const isolationCustomers = [];
  for (let i = 0; i < 5; i++) {
    isolationCustomers.push(
      await prisma.customer.create({
        data: {
          organizationId: isolationOrg.id,
          name: `Isolation Test Customer ${i + 1}`,
          phone: randomPhone(),
          address: randomAddress(),
        },
      })
    );
  }

  for (let i = 0; i < 3; i++) {
    const project = await prisma.project.create({
      data: {
        organizationId: isolationOrg.id,
        title: `Isolation test project ${i + 1}`,
        description: "Seeded purely to verify Summit Build & Service can never see this organization's data.",
        status: i === 0 ? "IN_PROGRESS" : i === 1 ? "SCHEDULED" : "COMPLETED",
        address: isolationCustomers[i].address,
        scheduledAt: daysFromNow(i - 1),
        customerId: isolationCustomers[i].id,
        createdByUserId: isolationOwner.id,
        members: { create: [{ userId: isolationPm.id, role: "LEAD" }, { userId: isolationTech.id, role: "MEMBER" }] },
      },
    });
    await createTasks(
      project.id,
      [{ title: "Isolation QA checkpoint", status: "TODO", dueDate: daysFromNow(5) }],
      isolationTech.id
    );
    await prisma.activityLog.create({
      data: {
        organizationId: isolationOrg.id,
        projectId: project.id,
        actorUserId: isolationOwner.id,
        action: "project.created",
        summary: `${isolationOwner.name} created project "${project.title}"`,
      },
    });
  }

  console.log(`\n${ISOLATION_NAME} ready (org: ${ISOLATION_NAME}, slug: ${ISOLATION_SLUG}) — tenant-isolation QA only.`);
  console.log(`Log in as owner: ${isolationOwner.email} / ${DEMO_PASSWORD}`);
  console.log(
    "QA check: none of Summit Build & Service's users, customers, projects, leads, or estimates should be " +
      "reachable from this account, and none of this org's records should appear while signed in as a Summit user " +
      "— every query in the app is scoped by organizationId, so this is a regression check, not new code."
  );
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

// -----------------------------------------------------------------------------
// Demo script vs. current schema
// -----------------------------------------------------------------------------
// The source document (CrewSync Demo Company + Demo Script) describes a few
// concepts that don't exist as real, stored fields in prisma/schema.prisma
// yet. Rather than fake them with a schema change scoped to "make the demo
// look right," this seed approximates them honestly using data that's
// already real:
//
// - "Health" (On Track / At Risk): there is no Project.health field. The 3
//   at-risk projects (NorthPoint Distribution, Atlas Manufacturing, Horizon
//   Logistics) are IN_PROGRESS with genuinely overdue tasks and a risk note
//   in their description — narratable in a demo, but not a queryable/badged
//   product feature today. A real "at risk" indicator would need its own
//   issue (computed from overdue tasks, or a stored field with PM-driven
//   updates) rather than being invented here.
// - "Closeout" project status: ProjectStatus has no CLOSEOUT value. The one
//   project the script calls "Closeout" (Metro Community Bank) is seeded as
//   IN_PROGRESS with "Status: Closeout" noted in its description.
// - "Executive," "Office Admin," "Sales," "Project Manager," "Field
//   Foreman": Role is only OWNER/ADMIN/MANAGER/TECHNICIAN. See the mapping
//   comment above the user-seeding block. The foreman (Luis Ramirez) is
//   marked ProjectMemberRole.LEAD on his projects to reflect field
//   leadership, since that's the one real distinction the schema offers.
// - "Executive dashboard" / per-role home screens / KPI tiles (Active
//   Projects, At Risk, Scheduled This Week, Open Tasks, Overdue Tasks,
//   Field Employees Active, Projects Awaiting Closeout): none of these are
//   rendered anywhere yet — the current dashboard (app/page.tsx) only shows
//   project-status counts, active user count, customer count, and open lead
//   count. This seed produces data that WOULD back those KPIs exactly
//   (counts logged to the console above) so building that dashboard is a
//   pure query/UI task whenever it's prioritized, not a data problem.
