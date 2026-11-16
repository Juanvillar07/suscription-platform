import { FrequencyType, PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import 'dotenv/config';
import { MercadoPagoClient } from '../src/mercadopago/mercadopago.client';
import { buildAutoRecurring } from '../src/mercadopago/mercadopago.mappers';

const prisma = new PrismaClient();

const PLANS = [
  {
    name: 'Básico',
    slug: 'basico',
    description: 'Ideal para empezar.',
    features: ['Acceso al contenido premium', 'Soporte por email'],
    price: 19900,
    frequency: 1,
    frequencyType: FrequencyType.MONTHS,
  },
  {
    name: 'Pro',
    slug: 'pro',
    description: 'Para usuarios que quieren todo.',
    features: ['Todo lo del plan Básico', 'Webinars mensuales', 'Soporte prioritario'],
    price: 39900,
    frequency: 1,
    frequencyType: FrequencyType.MONTHS,
    freeTrialDays: 7,
  },
];

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@example.com').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'Admin123!';
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: 'Administrador',
      role: Role.ADMIN,
      passwordHash: await bcrypt.hash(adminPassword, 10),
    },
  });
  console.log(`✔ Admin: ${adminEmail}`);

  const token = process.env.MP_ACCESS_TOKEN ?? '';
  const mp = token ? new MercadoPagoClient(token) : null;
  const backUrl = process.env.MP_BACK_URL ?? 'https://www.mercadopago.com.co';

  for (const data of PLANS) {
    const plan = await prisma.plan.upsert({
      where: { slug: data.slug },
      update: {},
      create: { ...data, freeTrialDays: data.freeTrialDays ?? null },
    });

    if (plan.mpPreapprovalPlanId) {
      console.log(`✔ Plan ${plan.slug} ya sincronizado (${plan.mpPreapprovalPlanId})`);
      continue;
    }
    if (!mp) {
      console.warn(`⚠ Plan ${plan.slug} creado SOLO en BD (sin MP_ACCESS_TOKEN). Usa POST /api/admin/plans/${plan.id}/sync-mp luego.`);
      continue;
    }
    try {
      const mpPlan = await mp.createPlan({
        reason: plan.name,
        auto_recurring: buildAutoRecurring(plan),
        back_url: backUrl,
      });
      await prisma.plan.update({ where: { id: plan.id }, data: { mpPreapprovalPlanId: mpPlan.id } });
      console.log(`✔ Plan ${plan.slug} creado en MP: ${mpPlan.id}`);
    } catch (e) {
      console.error(`✖ No se pudo crear ${plan.slug} en MP:`, e instanceof Error ? e.message : e);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
