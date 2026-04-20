const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash("admin123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@mail.com" },
    update: {
      name: "Admin",
      password: adminPassword,
      role: "admin",
    },
    create: {
      name: "Admin",
      email: "admin@mail.com",
      password: adminPassword,
      role: "admin",
    },
  });

  const vendorPassword = await bcrypt.hash("vendor123", 10);

  const vendor = await prisma.user.upsert({
    where: { email: "vendor@mail.com" },
    update: {
      name: "Vendor",
      password: vendorPassword,
      role: "vendor",
    },
    create: {
      name: "Vendor",
      email: "vendor@mail.com",
      password: vendorPassword,
      role: "vendor",
    },
  });

  const crewPassword = await bcrypt.hash("crew123", 10);

  const crew = await prisma.user.upsert({
    where: { email: "crew@mail.com" },
    update: {
      name: "Crew",
      password: crewPassword,
      role: "crew",
    },
    create: {
      name: "Crew",
      email: "crew@mail.com",
      password: crewPassword,
      role: "crew",
    },
  });

  console.log("Admin berhasil dibuat:", admin.email);
  console.log("Vendor berhasil dibuat:", vendor.email);
  console.log("Crew berhasil dibuat:", crew.email);
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
