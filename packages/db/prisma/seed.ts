/**
 * Seed script — bootstraps OnePlace tenant + admin (SUPER_ADMIN) + sample data + default workflows + sample license keys.
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
  LicenseStatus,
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
      brandColor: '#DB0000', // OnePlace keeps red - they're a tenant inside Pipely
      timezone: 'Asia/Kolkata',
      emailFromAddress: 'noreply@oneplacedigital.com',
      emailFromName: 'OnePlace Digital Academy',
    },
  });
  console.log(`✓ Tenant: ${tenant.name} (${tenant.id})`);

  // OnePlace admin is SUPER_ADMIN — can manage all tenants on the platform
  const adminPassword = await bcrypt.hash('OnePlace@2026', 12);
  const admin = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@oneplacedigital.com' } },
    update: { role: UserRole.SUPER_ADMIN },
    create: {
      tenantId: tenant.id,
      email: 'admin@oneplacedigital.com',
      name: 'OnePlace Admin',
      phone: '+919529622968',
      passwordHash: adminPassword,
      role: UserRole.SUPER_ADMIN,
    },
  });
  console.log(`✓ SUPER_ADMIN: ${admin.email} / OnePlace@2026`);

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
        },
      });
    }
    console.log(`✓ Sample leads: ${sampleLeads.length}`);
  }

  // Sample license keys for students
  const sampleLicenses = [
    {
      code: 'ONEPLACE-STUDENT-DEMO',
      name: 'Free student demo (90 days)',
      plan: TenantPlan.STARTER,
      validForDays: 90,
      maxRedemptions: 1000,
    },
    {
      code: 'ONEPLACE-PRO-1YEAR',
      name: 'OnePlace Pro 1 year',
      plan: TenantPlan.PRO,
      validForDays: 365,
      maxRedemptions: 1,
    },
  ];
  for (const lic of sampleLicenses) {
    await prisma.licenseKey.upsert({
      where: { code: lic.code },
      update: {},
      create: { ...lic, status: LicenseStatus.ACTIVE },
    });
  }
  console.log(`✓ Sample licenses: ${sampleLicenses.length}`);

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
            { type: 'SEND_WHATSAPP_TEMPLATE', params: { templateName: 'oneplace_welcome', language: 'en', variables: ['{{lead.fullName}}'] } },
            { type: 'SET_FOLLOWUP', params: { hours: 24 } },
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
          name: 'Send welcome email to new lead',
          trigger: WorkflowTrigger.LEAD_CREATED,
          triggerStatuses: [],
          actions: [{ type: 'SEND_EMAIL', params: { templateName: 'Welcome Email' } }],
        },
      ],
    });
    console.log('✓ Default workflows: 3');
  }

  // Default email template
  const existingTemplate = await prisma.emailTemplate.findFirst({
    where: { tenantId: tenant.id, name: 'Welcome Email' },
  });
  if (!existingTemplate) {
    await prisma.emailTemplate.create({
      data: {
        tenantId: tenant.id,
        name: 'Welcome Email',
        subject: 'Welcome to OnePlace Digital Academy, {{lead.firstName}}!',
        bodyHtml: `<div style="font-family:system-ui,sans-serif;max-width:600px;margin:0 auto;padding:20px">
  <h2 style="color:#DB0000">Welcome, {{lead.firstName}}!</h2>
  <p>Thanks for showing interest in OnePlace Digital Academy — the #1 AI-First Marketing Institute in Nashik.</p>
  <p>Our team will reach out to you on +91 95296 22968 within 24 hours to schedule your free demo session.</p>
  <p>In the meantime, here's what makes OnePlace different:</p>
  <ul>
    <li>AI-integrated curriculum (ChatGPT, Claude, Midjourney workflows)</li>
    <li>100% placement support</li>
    <li>Live Meta Ads + Google Ads project work</li>
    <li>Real client projects during course</li>
  </ul>
  <p>Have questions? Reply to this email or WhatsApp us anytime.</p>
  <p>Best,<br/><strong>Team OnePlace</strong></p>
</div>`,
      },
    });
    console.log('✓ Default email template: Welcome Email');
  }

  console.log('\n✅ Seed complete!\n');
  console.log('LOGINS:');
  console.log('  SUPER_ADMIN: admin@oneplacedigital.com / OnePlace@2026');
  console.log('  Counselor:   priya@oneplacedigital.com / Counselor@2026');
  console.log('\nSTUDENT SIGNUP CODES:');
  console.log('  ONEPLACE-STUDENT-DEMO  (Starter 90 days, 1000 students can use)');
  console.log('  ONEPLACE-PRO-1YEAR     (Pro 1 year, single-use - generate more via Super Admin)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
