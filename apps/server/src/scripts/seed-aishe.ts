/**
 * AISHE College Seeder
 * 
 * Parses a local CSV/JSON file of colleges from the All India Survey
 * on Higher Education (AISHE) / data.gov.in dataset and bulk-upserts
 * them into the PostgreSQL database.
 * 
 * Usage:
 *   npx ts-node src/scripts/seed-aishe.ts [path-to-csv]
 * 
 * If no file path is provided, seeds a curated sample of ~50 major
 * Indian colleges for development purposes.
 */

import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";

const prisma = new PrismaClient();

// ─── Sample AISHE Dataset (for dev when no CSV is available) ─────
const SAMPLE_COLLEGES = [
  { name: "Indian Institute of Technology Delhi", location: "New Delhi", domain: "iitd.ac.in", aisheCode: "U-0456", state: "Delhi", district: "New Delhi", managementType: "Central Govt" },
  { name: "Indian Institute of Technology Bombay", location: "Mumbai", domain: "iitb.ac.in", aisheCode: "U-0454", state: "Maharashtra", district: "Mumbai", managementType: "Central Govt" },
  { name: "Indian Institute of Technology Madras", location: "Chennai", domain: "iitm.ac.in", aisheCode: "U-0458", state: "Tamil Nadu", district: "Chennai", managementType: "Central Govt" },
  { name: "Indian Institute of Technology Kanpur", location: "Kanpur", domain: "iitk.ac.in", aisheCode: "U-0457", state: "Uttar Pradesh", district: "Kanpur Nagar", managementType: "Central Govt" },
  { name: "Indian Institute of Technology Kharagpur", location: "Kharagpur", domain: "iitkgp.ac.in", aisheCode: "U-0455", state: "West Bengal", district: "Paschim Medinipur", managementType: "Central Govt" },
  { name: "Indian Institute of Technology Roorkee", location: "Roorkee", domain: "iitr.ac.in", aisheCode: "U-0460", state: "Uttarakhand", district: "Haridwar", managementType: "Central Govt" },
  { name: "Indian Institute of Technology Guwahati", location: "Guwahati", domain: "iitg.ac.in", aisheCode: "U-0459", state: "Assam", district: "Kamrup Metropolitan", managementType: "Central Govt" },
  { name: "Indian Institute of Technology Hyderabad", location: "Hyderabad", domain: "iith.ac.in", aisheCode: "U-0703", state: "Telangana", district: "Sangareddy", managementType: "Central Govt" },
  { name: "BITS Pilani", location: "Pilani", domain: "bits-pilani.ac.in", aisheCode: "U-0098", state: "Rajasthan", district: "Jhunjhunu", managementType: "Private" },
  { name: "Delhi University", location: "New Delhi", domain: "du.ac.in", aisheCode: "U-0167", state: "Delhi", district: "New Delhi", managementType: "Central Govt" },
  { name: "Jawaharlal Nehru University", location: "New Delhi", domain: "jnu.ac.in", aisheCode: "U-0305", state: "Delhi", district: "New Delhi", managementType: "Central Govt" },
  { name: "Anna University", location: "Chennai", domain: "annauniv.edu", aisheCode: "S-0034", state: "Tamil Nadu", district: "Chennai", managementType: "State Govt" },
  { name: "VIT Vellore", location: "Vellore", domain: "vit.ac.in", aisheCode: "U-0672", state: "Tamil Nadu", district: "Vellore", managementType: "Private" },
  { name: "SRM Institute of Science and Technology", location: "Chennai", domain: "srmist.edu.in", aisheCode: "U-0592", state: "Tamil Nadu", district: "Kancheepuram", managementType: "Private" },
  { name: "Manipal Academy of Higher Education", location: "Manipal", domain: "manipal.edu", aisheCode: "U-0387", state: "Karnataka", district: "Udupi", managementType: "Private" },
  { name: "NIT Trichy", location: "Tiruchirappalli", domain: "nitt.edu", aisheCode: "U-0432", state: "Tamil Nadu", district: "Tiruchirappalli", managementType: "Central Govt" },
  { name: "NIT Warangal", location: "Warangal", domain: "nitw.ac.in", aisheCode: "U-0438", state: "Telangana", district: "Warangal", managementType: "Central Govt" },
  { name: "NIT Surathkal", location: "Mangalore", domain: "nitk.ac.in", aisheCode: "U-0434", state: "Karnataka", district: "Dakshina Kannada", managementType: "Central Govt" },
  { name: "IIIT Hyderabad", location: "Hyderabad", domain: "iiit.ac.in", aisheCode: "U-0261", state: "Telangana", district: "Hyderabad", managementType: "Central Govt" },
  { name: "PSG College of Technology", location: "Coimbatore", domain: "psgtech.edu", aisheCode: "C-24539", state: "Tamil Nadu", district: "Coimbatore", managementType: "Private" },
  { name: "College of Engineering Pune", location: "Pune", domain: "coep.org.in", aisheCode: "C-31234", state: "Maharashtra", district: "Pune", managementType: "State Govt" },
  { name: "Jadavpur University", location: "Kolkata", domain: "jaduniv.edu.in", aisheCode: "S-0289", state: "West Bengal", district: "Kolkata", managementType: "State Govt" },
  { name: "Amity University", location: "Noida", domain: "amity.edu", aisheCode: "U-0024", state: "Uttar Pradesh", district: "Gautam Buddha Nagar", managementType: "Private" },
  { name: "Lovely Professional University", location: "Phagwara", domain: "lpu.in", aisheCode: "U-0370", state: "Punjab", district: "Kapurthala", managementType: "Private" },
  { name: "Chandigarh University", location: "Mohali", domain: "cuchd.in", aisheCode: "U-0708", state: "Punjab", district: "SAS Nagar", managementType: "Private" },
  { name: "IIM Ahmedabad", location: "Ahmedabad", domain: "iima.ac.in", aisheCode: "U-0240", state: "Gujarat", district: "Ahmedabad", managementType: "Central Govt" },
  { name: "IIM Bangalore", location: "Bengaluru", domain: "iimb.ac.in", aisheCode: "U-0241", state: "Karnataka", district: "Bengaluru Urban", managementType: "Central Govt" },
  { name: "IIM Calcutta", location: "Kolkata", domain: "iimcal.ac.in", aisheCode: "U-0242", state: "West Bengal", district: "South 24 Parganas", managementType: "Central Govt" },
  { name: "Thapar Institute of Engineering and Technology", location: "Patiala", domain: "thapar.edu", aisheCode: "U-0642", state: "Punjab", district: "Patiala", managementType: "Private" },
  { name: "Savitribai Phule Pune University", location: "Pune", domain: "unipune.ac.in", aisheCode: "S-0564", state: "Maharashtra", district: "Pune", managementType: "State Govt" },
  { name: "University of Hyderabad", location: "Hyderabad", domain: "uohyd.ac.in", aisheCode: "U-0656", state: "Telangana", district: "Hyderabad", managementType: "Central Govt" },
  { name: "Banaras Hindu University", location: "Varanasi", domain: "bhu.ac.in", aisheCode: "U-0073", state: "Uttar Pradesh", district: "Varanasi", managementType: "Central Govt" },
  { name: "Aligarh Muslim University", location: "Aligarh", domain: "amu.ac.in", aisheCode: "U-0017", state: "Uttar Pradesh", district: "Aligarh", managementType: "Central Govt" },
  { name: "Indian Statistical Institute", location: "Kolkata", domain: "isical.ac.in", aisheCode: "U-0280", state: "West Bengal", district: "Kolkata", managementType: "Central Govt" },
  { name: "AIIMS Delhi", location: "New Delhi", domain: "aiims.edu", aisheCode: "U-0012", state: "Delhi", district: "New Delhi", managementType: "Central Govt" },
  { name: "Christ University", location: "Bengaluru", domain: "christuniversity.in", aisheCode: "U-0133", state: "Karnataka", district: "Bengaluru Urban", managementType: "Private" },
  { name: "Symbiosis International University", location: "Pune", domain: "siu.edu.in", aisheCode: "U-0624", state: "Maharashtra", district: "Pune", managementType: "Private" },
  { name: "Shiv Nadar University", location: "Greater Noida", domain: "snu.edu.in", aisheCode: "U-0583", state: "Uttar Pradesh", district: "Gautam Buddha Nagar", managementType: "Private" },
  { name: "KIIT University", location: "Bhubaneswar", domain: "kiit.ac.in", aisheCode: "U-0330", state: "Odisha", district: "Khordha", managementType: "Private" },
  { name: "Osmania University", location: "Hyderabad", domain: "osmania.ac.in", aisheCode: "S-0463", state: "Telangana", district: "Hyderabad", managementType: "State Govt" },
  { name: "Jamia Millia Islamia", location: "New Delhi", domain: "jmi.ac.in", aisheCode: "U-0294", state: "Delhi", district: "New Delhi", managementType: "Central Govt" },
  { name: "IIT BHU Varanasi", location: "Varanasi", domain: "iitbhu.ac.in", aisheCode: "U-0453", state: "Uttar Pradesh", district: "Varanasi", managementType: "Central Govt" },
  { name: "NIT Rourkela", location: "Rourkela", domain: "nitrkl.ac.in", aisheCode: "U-0436", state: "Odisha", district: "Sundargarh", managementType: "Central Govt" },
  { name: "NIT Calicut", location: "Kozhikode", domain: "nitc.ac.in", aisheCode: "U-0429", state: "Kerala", district: "Kozhikode", managementType: "Central Govt" },
  { name: "IIT Indore", location: "Indore", domain: "iiti.ac.in", aisheCode: "U-0704", state: "Madhya Pradesh", district: "Indore", managementType: "Central Govt" },
  { name: "DTU Delhi", location: "New Delhi", domain: "dtu.ac.in", aisheCode: "S-0174", state: "Delhi", district: "New Delhi", managementType: "State Govt" },
  { name: "NSUT Delhi", location: "New Delhi", domain: "nsut.ac.in", aisheCode: "S-0448", state: "Delhi", district: "New Delhi", managementType: "State Govt" },
  { name: "IIIT Delhi", location: "New Delhi", domain: "iiitd.ac.in", aisheCode: "S-0257", state: "Delhi", district: "New Delhi", managementType: "State Govt" },
];

/**
 * Parse a CSV file with columns: name, location, domain, aisheCode, state, district, managementType
 */
function parseCsv(filePath: string) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim());
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  
  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const obj: any = {};
    headers.forEach((h, i) => { obj[h] = values[i] || ""; });
    return {
      name: obj.name || obj.institution_name || "",
      location: obj.location || obj.city || obj.district || "",
      domain: obj.domain || obj.website || `${(obj.name || "").toLowerCase().replace(/\s+/g, "")}.edu`,
      aisheCode: obj.aishecode || obj.aishe_code || obj.code || "",
      state: obj.state || "",
      district: obj.district || "",
      managementType: obj.managementtype || obj.management_type || obj.management || "",
    };
  }).filter((c) => c.name.length > 0);
}

async function seed() {
  const csvPath = process.argv[2];
  let colleges: typeof SAMPLE_COLLEGES;

  if (csvPath && fs.existsSync(csvPath)) {
    console.log(`📄 Parsing AISHE CSV from: ${csvPath}`);
    colleges = parseCsv(csvPath);
    console.log(`   Found ${colleges.length} colleges in dataset`);
  } else {
    console.log("📦 No CSV file provided — seeding with curated sample of 48 major Indian colleges");
    colleges = SAMPLE_COLLEGES;
  }

  console.log("🔄 Starting bulk upsert...");

  // Use transaction for high-performance bulk upsert
  const batchSize = 50;
  let inserted = 0;
  let updated = 0;

  for (let i = 0; i < colleges.length; i += batchSize) {
    const batch = colleges.slice(i, i + batchSize);

    await prisma.$transaction(
      batch.map((c) =>
        prisma.college.upsert({
          where: { domain: c.domain },
          create: {
            name: c.name,
            location: c.location,
            domain: c.domain,
            aisheCode: c.aisheCode || null,
            state: c.state || null,
            district: c.district || null,
            managementType: c.managementType || null,
          },
          update: {
            name: c.name,
            location: c.location,
            aisheCode: c.aisheCode || undefined,
            state: c.state || undefined,
            district: c.district || undefined,
            managementType: c.managementType || undefined,
          },
        })
      )
    );

    inserted += batch.length;
    process.stdout.write(`\r   Processed ${inserted}/${colleges.length} colleges...`);
  }

  console.log(`\n✅ Seeded ${colleges.length} colleges successfully!`);

  // Create default spaces for each college
  console.log("🏗️  Creating default spaces for each college...");
  const allColleges = await prisma.college.findMany({ select: { id: true } });
  const defaultSpaces = ["#general", "#notes", "#pyqs", "#placements", "#fests", "#memes"];
  const categories = ["Social", "Academic", "Academic", "Career", "Social", "Social"];

  let spaceCount = 0;
  for (const college of allColleges) {
    for (let j = 0; j < defaultSpaces.length; j++) {
      const existing = await prisma.space.findFirst({
        where: { collegeId: college.id, name: defaultSpaces[j] },
      });
      if (!existing) {
        await prisma.space.create({
          data: { collegeId: college.id, name: defaultSpaces[j], category: categories[j] },
        });
        spaceCount++;
      }
    }
  }

  console.log(`✅ Created ${spaceCount} new spaces across ${allColleges.length} colleges`);
}

seed()
  .catch((e) => { console.error("❌ Seed error:", e); process.exit(1); })
  .finally(() => prisma.$disconnect());
