const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10);

  const user = await prisma.user.upsert({
    where: { email: "admin@mail.com" },
    update: {
      name: "Admin",
      password: hashedPassword,
      role: "admin",
    },
    create: {
      name: "Admin",
      email: "admin@mail.com",
      password: hashedPassword,
      role: "admin",
    },
  });

  console.log("User berhasil dibuat:", user.email);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
