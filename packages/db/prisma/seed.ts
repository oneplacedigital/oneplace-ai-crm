/**
 * Seed script — bootstraps OnePlace tenant + admin + sample data + default workflows.
 * Run: pnpm db:seed
 */
import {
  PrismaClient,
  UserRole,
  LeadStatus,
  LeadSource,
  CoursePace,
  TenantPlan,
  ActivityType,
  WorkflowTrigger,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding ONEPLACE AI CRM...');

  const tenant = await prisma.tenant.upsert({
    where: { slug: 'oneplace' },
    update: {},
    create: {
      slug: 'oneplace',
      name: 'OnePlace Digital Academy',
      email: 'oneplacedigitalacademy@gmail.com',
      phone: '+919529622968',
      city: 'Nashik',
      country: 'IN',
      plan: TenantPlan.PRO,
      brandColor: '#DB0000',
      timezone: 'Asia/Kolkata',
    },
  });
  console.log(`✓ Tenant: ${tenant.name} (${tenant.id})`);

  const adminPassword = await bcrypt.hash('OnePlace@2026', 12);
  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@oneplacedigital.com' } },
    update: {},
    create: {
      tenantId: tenant.id,
      email: 'admin@oneplacedigital.com',
      name: 'OnePlace Admin',
      phone: '+919529622968',
      passwordHash: adminPassword,
      role: UserRole.TENANT_ADMIN,
    },
  });
  console.log(`✓ Admin: ${admin.email} / OnePlace@2026`);

  const counselorPassword = await bcrypt.hash('Counselor@2026', 12);
  const counselors = await Promise.all(
    [
      { email: 'priya@oneplacedigital.com', name: 'Priya Sharma' },
      { email: 'rohan@oneplacedigital.com', name: 'Rohan Patil' },
    ].map((c) =>
      prisma.user.upsert({
        where: { tenantId_email: { tenantId: tenant.id, email: c.email } },
        update: {},
        create: {
          tenantId: tenant.id,
          email: c.email,
          name: c.name,
          passwordHash: counselorPassword,
          role: UserRole.COUNSELOR,
        },
      }),
    ),
  );
  console.log(`✓ Counselors: ${counselors.map((c) => c.name).join(', ')} / Counselor@2026`);

  const courses = await Promise.all(
    [
      {
        code: 'AI-DM-PRO',
        name: 'AI-Integrated Digital Marketing — Pro',
        durationWeeks: 16,
        feeInr: 49999,
        pace: CoursePace.WEEKDAY,
      },
      {
        code: 'SEO-PRO',
        name: 'Advanced SEO & Content Marketing',
        durationWeeks: 10,
        feeInr: 24999,
        pace: CoursePace.WEEKEND,
      },
      {
        code: 'SMM-PRO',
        name: 'Social Media Marketing Mastery',
        durationWeeks: 8,
        feeInr: 19999,
        pace: CoursePace.EVENING,
      },
    ].map((c) =>
      prisma.course.upsert({
        where: { tenantId_code: { tenantId: tenant.id, code: c.code } },
        update: {},
        create: { ...c, tenantId: tenant.id },
      }),
    ),
  );
  console.log(`✓ Courses: ${courses.length}`);

  const existingLeads = await prisma.lead.count({ where: { tenantId: tenant.id } });
  if (existingLeads === 0) {
    const sampleLeads = [
      {
        fullName: 'Aarav Deshmukh',
        phone: '+919876543210',
        email: 'aarav@example.com',
        city: 'Nashik',
        status: LeadStatus.NEW,
        source: LeadSource.META_ADS,
        sourceDetail: 'AI-DM Lead Form May 2026',
        courseId: courses[0]!.id,
        assignedToId: counselors[0]!.id,
        priority: 1,
        score: 78,
      },
      {
        fullName: 'Sneha Kulkarni',
        phone: '+919876543211',
        email: 'sneha@example.com',
        city: 'Nashik',
        status: LeadStatus.INTERESTED,
        source: LeadSource.WEBSITE_FORM,
        courseId: courses[1]!.id,
        assignedToId: counselors[1]!.id,
        priority: 2,
        score: 62,
      },
      {
        fullName: 'Vikas Jadhav',
        phone: '+919876543212',
        city: 'Nashik',
        status: LeadStatus.QUALIFIED,
        source: LeadSource.REFERRAL,
        courseId: courses[0]!.id,
        assignedToId: counselors[0]!.id,
        priority: 1,
        score: 85,
        budgetInr: 50000,
      },
      {
        fullName: 'Kavya Iyer',
        phone: '+919876543213',
        email: 'kavya@example.com',
        city: 'Nashik',
        status: LeadStatus.DEMO_SCHEDULED,
        source: LeadSource.META_ADS,
        courseId: courses[2]!.id,
        assignedToId: counselors[1]!.id,
        priority: 1,
        score: 80,
        expectedJoinAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      },
      {
        fullName: 'Manish Pawar',
        phone: '+919876543214',
        city: 'Nashik',
        status: LeadStatus.ADMISSION_CONFIRMED,
        source: LeadSource.WALK_IN,
        courseId: courses[0]!.id,
        assignedToId: counselors[0]!.id,
        priority: 1,
        score: 95,
      },
    ];

    for (const lead of sampleLeads) {
      const created = await prisma.lead.create({
        data: { ...lead, tenantId: tenant.id },
      });
      await prisma.leadActivity.create({
        data: {
          tenantId: tenant.id,
          leadId: created.id,
          userId: admin.id,
          type: ActivityType.SYSTEM,
          title: 'Lead created via seed',
          body: `Seeded sample lead for ${created.fullName}`,
        },
      });
    }
    console.log(`✓ Sample leads: ${sampleLeads.length}`);
  } else {
    console.log(`✓ Leads already present: ${existingLeads} — skipped sample insert`);
  }

  // Default workflows
  const existingWorkflows = await prisma.workflow.count({ where: { tenantId: tenant.id } });
  if (existingWorkflows === 0) {
    await prisma.workflow.createMany({
      data: [
        {
          tenantId: tenant.id,
          name: 'Welcome new lead via WhatsApp',
          trigger: WorkflowTrigger.LEAD_CREATED,
          triggerStatuses: [],
          actions: [
            {
              type: 'SEND_WHATSAPP_TEMPLATE',
              params: {
                templateName: 'oneplace_welcome',
                language: 'en',
                variables: ['{{lead.fullName}}'],
              },
            },
            {
              type: 'SET_FOLLOWUP',
              params: { hours: 24 },
            },
          ],
        },
        {
          tenantId: tenant.id,
          name: 'Fire Meta Purchase event when paid',
          trigger: WorkflowTrigger.LEAD_STATUS_CHANGED,
          triggerStatuses: [LeadStatus.PAYMENT_COMPLETED],
          actions: [{ type: 'SEND_META_EVENT', params: { eventName: 'Purchase' } }],
        },
        {
          tenantId: tenant.id,
          name: 'Notify counselor on demo booked',
          trigger: WorkflowTrigger.LEAD_STATUS_CHANGED,
          triggerStatuses: [LeadStatus.DEMO_SCHEDULED],
          actions: [{ type: 'NOTIFY_COUNSELOR', params: { message: 'Demo booked — confirm slot.' } }],
        },
      ],
    });
    console.log('✓ Default workflows: 3');
  }

  console.log('\n✅ Seed complete!\n');
  console.log('Login (admin):     admin@oneplacedigital.com / OnePlace@2026');
  console.log('Login (counselor): priya@oneplacedigital.com / Counselor@2026');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
