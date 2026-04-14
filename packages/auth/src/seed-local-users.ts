import { disconnectPrismaClient, getPrismaClient } from '@metrev/database';

import { hashPassword } from './password';

type SeedRole = 'ADMIN' | 'ANALYST' | 'VIEWER';

type SeedUserConfig = {
  role: SeedRole;
  envPrefix: 'ADMIN' | 'ANALYST' | 'VIEWER';
  defaultEmail: string;
  defaultName: string;
  defaultPassword: string;
};

const seedUsers: SeedUserConfig[] = [
  {
    role: 'ADMIN',
    envPrefix: 'ADMIN',
    defaultEmail: 'admin@metrev.local',
    defaultName: 'METREV Local Admin',
    defaultPassword: 'MetrevAdminPass123!',
  },
  {
    role: 'ANALYST',
    envPrefix: 'ANALYST',
    defaultEmail: 'analyst@metrev.local',
    defaultName: 'METREV Local Analyst',
    defaultPassword: 'MetrevAnalystPass123!',
  },
  {
    role: 'VIEWER',
    envPrefix: 'VIEWER',
    defaultEmail: 'viewer@metrev.local',
    defaultName: 'METREV Local Viewer',
    defaultPassword: 'MetrevViewerPass123!',
  },
];

function envValue(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  return value && value.length > 0 ? value : fallback;
}

function getSeedIdentity(config: SeedUserConfig): {
  email: string;
  name: string;
  password: string;
} {
  const email = envValue(
    `METREV_LOCAL_${config.envPrefix}_EMAIL`,
    config.defaultEmail,
  ).toLowerCase();
  const name = envValue(
    `METREV_LOCAL_${config.envPrefix}_NAME`,
    config.defaultName,
  );
  const password = envValue(
    `METREV_LOCAL_${config.envPrefix}_PASSWORD`,
    config.defaultPassword,
  );

  if (password.length < 8) {
    throw new Error(
      `METREV_LOCAL_${config.envPrefix}_PASSWORD must contain at least 8 characters.`,
    );
  }

  return { email, name, password };
}

async function main(): Promise<void> {
  const prisma = getPrismaClient();

  try {
    const seededUsers = await Promise.all(
      seedUsers.map(async (config) => {
        const identity = getSeedIdentity(config);
        const passwordHash = await hashPassword(identity.password);

        const user = await prisma.user.upsert({
          where: { email: identity.email },
          update: {
            name: identity.name,
            role: config.role,
            passwordHash,
          },
          create: {
            email: identity.email,
            name: identity.name,
            role: config.role,
            passwordHash,
          },
          select: {
            id: true,
            email: true,
            role: true,
          },
        });

        await prisma.session.deleteMany({
          where: { userId: user.id },
        });

        return user;
      }),
    );

    console.log(`Seeded ${seededUsers.length} local auth users.`);
    for (const user of seededUsers) {
      console.log(`- ${user.role}: ${user.email}`);
    }
  } finally {
    await disconnectPrismaClient();
  }
}

void main();
