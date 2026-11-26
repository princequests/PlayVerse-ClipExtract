import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const records = [
  {
    title: "Beyond the Horizon",
    description: "A breathtaking journey through a world waiting to be discovered.",
    imageUrl: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1000",
    category: "Movies", kind: "Film", tags: ["Adventure", "Sci-Fi"],
    status: "Published", featured: true, year: "2025", duration: "2h 04m",
    sources: { create: [{ provider: "YouTube", url: "https://www.youtube.com/watch?v=aqz-KE-bpKQ", isPrimary: true }] }
  },
  {
    title: "Neon Nights",
    description: "A new generation discovers the secrets hidden beneath their city.",
    imageUrl: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=700",
    category: "Anime", kind: "Series", tags: ["Anime", "Fantasy"],
    status: "Published", featured: false, year: "2025",
    sources: { create: [{ provider: "Vimeo", url: "https://vimeo.com/76979871", isPrimary: true }] }
  },
  {
    title: "Wild Earth",
    description: "An intimate look at the extraordinary life of the natural world.",
    imageUrl: "https://images.unsplash.com/photo-1472396961693-142e6e269027?w=700",
    category: "Documentaries", kind: "Documentary", tags: ["Nature", "Wildlife"],
    status: "Draft", featured: false, year: "2024", duration: "48 min",
    sources: { create: [{ provider: "YouTube", url: "https://www.youtube.com/watch?v=ScMzIvxBSi4", isPrimary: true }] }
  }
];

async function main() {
  if (await prisma.content.count() > 0) {
    console.log("PlayVerse already contains content; seed skipped.");
    return;
  }
  for (const record of records) await prisma.content.create({ data: record });
  console.log("Seeded PlayVerse demonstration catalogue.");
}

main().finally(async () => prisma.$disconnect());
