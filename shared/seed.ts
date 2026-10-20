import { profileSchema, type Profile, type Stage } from "./schema";
import { cities } from "./constants";

export const DEMO_PASSWORD = "TdcDemo2026!";
export const demoUsers = [
  {
    id: "matchmaker-1",
    username: "priya",
    name: "Priya Sharma",
    role: "Senior matchmaker",
  },
  {
    id: "matchmaker-2",
    username: "rohan",
    name: "Rohan Mehta",
    role: "Matchmaker",
  },
];
const women = [
  "Ananya",
  "Meera",
  "Riya",
  "Kavya",
  "Aditi",
  "Sanya",
  "Ishita",
  "Naina",
  "Tara",
  "Diya",
  "Avni",
  "Shreya",
  "Sara",
  "Neha",
  "Mira",
  "Suhani",
  "Zoya",
  "Priyanka",
  "Nikita",
  "Pooja",
];
const men = [
  "Arjun",
  "Rohan",
  "Kabir",
  "Aditya",
  "Vikram",
  "Dev",
  "Rahul",
  "Karan",
  "Ishaan",
  "Aarav",
  "Rishi",
  "Neil",
  "Sameer",
  "Varun",
  "Dhruv",
  "Akash",
  "Rehan",
  "Vivaan",
  "Nikhil",
  "Siddharth",
];
const surnames = [
  "Mehta",
  "Sharma",
  "Kapoor",
  "Rao",
  "Iyer",
  "Malhotra",
  "Shah",
  "Nair",
  "Verma",
  "Desai",
  "Khan",
  "Bose",
  "Singh",
  "Patel",
  "Menon",
  "Sethi",
  "Gupta",
  "Das",
  "Joshi",
  "Kulkarni",
];
const jobs = [
  ["Product Designer", "Studio North", "B.Des", "NID Ahmedabad"],
  ["Software Engineer", "Atlassian", "B.Tech", "BITS Pilani"],
  ["Strategy Consultant", "Deloitte", "B.Com", "SRCC Delhi"],
  ["Architect", "Common Ground", "B.Arch", "CEPT Ahmedabad"],
  ["Product Manager", "Microsoft", "B.Tech", "IIT Bombay"],
  ["Marketing Lead", "Unilever", "BBA", "Christ University"],
  ["Doctor", "Apollo Hospitals", "MBBS", "KMC Manipal"],
  ["Research Scientist", "Biocon", "B.Sc", "IISc Bengaluru"],
];
const allInterests = [
  "Travel",
  "Reading",
  "Cooking",
  "Hiking",
  "Music",
  "Art",
  "Fitness",
  "Photography",
];
const allValues = [
  "Family",
  "Independence",
  "Kindness",
  "Ambition",
  "Shared responsibilities",
  "Curiosity",
];
export const LEGACY_BIO =
  "A little ambitious, a little old-school. I value honest conversations, showing up for people, and making space for the small joys in everyday life.";
export const LEGACY_CAREER_PRIORITY =
  "Growing a meaningful career while making time for family.";

// Text is derived from declared fields so the fictional narrative never contradicts biodata.
function addNarrative(p: Profile) {
  p.careerPriority =
    p.workStyle === "Variable hours"
      ? "My work hours vary. Planning time together in advance helps me protect both my career and my personal life."
      : p.workStyle === "Regular hours"
        ? "I value a steady work routine and making time for family and shared responsibilities outside work."
        : "Flexibility in my work matters to me. I want both partners to have room to grow in their careers.";
  const children =
    p.wantKids === "Yes"
      ? "I would like children in the future."
      : p.wantKids === "No"
        ? "I do not plan to have children."
        : "I am still considering what having children would mean for me.";
  p.bio = `I live in ${p.city} and work as a ${p.designation.toLowerCase()}. Outside work, I enjoy ${p.interests.map((v) => v.toLowerCase()).join(", ")}. ${children} ${p.relocate === "No" ? "I hope to build a life in my current city." : p.relocate === "Yes" ? `I would consider moving to ${p.relocationCities.join(" or ")}.` : "Relocation would need a conversation about both our plans."}`;
}
let seed = 42;
function random() {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return (seed >>> 0) / 4294967296;
}
const pick = <T>(items: readonly T[]): T =>
  items[Math.floor(random() * items.length)];
const select = (items: string[], count: number): string[] => {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count);
};

function profile(
  i: number,
  gender: Profile["gender"],
  customer = false,
): Profile {
  const firstName = (gender === "Female" ? women : men)[i % 20],
    lastName = surnames[(i * 7 + (gender === "Female" ? 0 : 3)) % 20];
  const [designation, company, degree, college] = pick(jobs);
  const city = pick(cities);
  const birthYear =
    2026 - (customer ? 28 + (i % 8) : 24 + Math.floor(random() * 14));
  const result: Profile = {
    id: `${customer ? "client" : "pool"}-${gender === "Female" ? "f" : "m"}-${i + 1}`,
    firstName,
    lastName,
    gender,
    dob: `${birthYear}-${String(1 + (i % 12)).padStart(2, "0")}-${String(1 + (i % 27)).padStart(2, "0")}`,
    city,
    country: "India",
    height:
      gender === "Female"
        ? 155 + Math.floor(random() * 22)
        : 168 + Math.floor(random() * 23),
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${i}@example.com`,
    phone: "+91 ••••• ••" + String(100 + i).slice(-3),
    college,
    degree,
    income: (10 + Math.floor(random() * 38)) * 100000,
    currency: "INR",
    incomePeriod: "annual",
    company,
    designation,
    maritalStatus:
      i % 11 === 7 ? "Divorced" : i % 29 === 8 ? "Widowed" : "Never married",
    languages: [
      "English",
      pick(["Hindi", "Tamil", "Marathi", "Kannada", "Bengali", "Malayalam"]),
    ],
    motherTongue: pick([
      "Hindi",
      "Tamil",
      "Marathi",
      "Kannada",
      "Bengali",
      "Malayalam",
    ]),
    siblings:
      i % 3 === 0
        ? "Only child"
        : i % 3 === 1
          ? "One younger sister"
          : "One older brother",
    caste: null,
    religion: pick(["Hindu", "Muslim", "Christian", "Sikh", "Jain", null]),
    wantKids: pick(["Yes", "Yes", "Yes", "No", "Maybe"] as const),
    relocate: pick(["Yes", "No", "Maybe"] as const),
    pets: pick(["Yes", "Yes", "Maybe", "No"] as const),
    bio: "A little ambitious, a little old-school. I value honest conversations, showing up for people, and making space for the small joys in everyday life.",
    interests: select(allInterests, 3),
    values: select(allValues, 3),
    diet: pick(["Vegetarian", "Non-vegetarian", "Vegan"] as const),
    smoking: pick(["No", "No", "Occasionally"] as const),
    drinking: pick(["No", "Socially"] as const),
    existingChildren: 0,
    timeline: pick([
      "Within a year",
      "1–2 years",
      "Open to discussing",
    ] as const),
    livingArrangement: pick([
      "Independent",
      "With family",
      "Flexible",
    ] as const),
    workStyle: pick(["Flexible", "Regular hours", "Variable hours"] as const),
    careerSupport: "Yes",
    careerPriority: "Growing a meaningful career while making time for family.",
    relocationCities: select(cities, 3),
    verified: customer ? i !== 4 : i % 13 !== 9,
    active: true,
    available: customer || i % 17 !== 12,
    preferences: {
      minAge: 24,
      maxAge: 42,
      strictAge: false,
      cities: [],
      strictLocation: false,
      maritalStatuses: ["Never married", "Divorced", "Widowed"],
      diet: "Any",
      strictDiet: false,
      smoking: "Any",
      strictSmoking: false,
    },
  };
  return result;
}

export function createSeed() {
  seed = 42;
  const candidates = [
    ...Array.from({ length: 100 }, (_, i) => profile(i, "Female")),
    ...Array.from({ length: 100 }, (_, i) => profile(i, "Male")),
  ];
  const clients = Array.from({ length: 12 }, (_, i) =>
    profile(i, i % 2 === 0 ? "Female" : "Male", true),
  );
  Object.assign(clients[0], {
    firstName: "Ananya",
    lastName: "Mehta",
    dob: "1997-04-18",
    city: "Bengaluru",
    designation: "Product Designer",
    company: "Studio North",
    degree: "B.Des",
    college: "NID Ahmedabad",
    income: 2800000,
    height: 165,
    wantKids: "Yes",
    relocate: "Yes",
    pets: "Yes",
    timeline: "1–2 years",
    livingArrangement: "Independent",
    workStyle: "Flexible",
    interests: ["Travel", "Reading", "Art"],
    values: ["Family", "Independence", "Kindness"],
    languages: ["English", "Hindi"],
    relocationCities: ["Mumbai", "Pune"],
  });
  Object.assign(clients[1], {
    firstName: "Arjun",
    lastName: "Kapoor",
    dob: "1993-02-12",
    city: "Mumbai",
    income: 4200000,
    height: 183,
    wantKids: "Yes",
    relocate: "Yes",
    pets: "Yes",
    relocationCities: ["Bengaluru", "Pune"],
    timeline: "1–2 years",
  });
  for (let i = 0; i < 4; i++) {
    Object.assign(candidates[100 + i], {
      city: "Bengaluru",
      dob: `199${2 + i}-03-14`,
      wantKids: "Yes",
      relocate: "Yes",
      pets: "Yes",
      timeline: "1–2 years",
      livingArrangement: "Independent",
      workStyle: "Flexible",
      languages: ["English", "Hindi"],
      values: ["Family", "Independence", "Kindness"],
      interests: i
        ? ["Travel", "Music", "Reading"]
        : ["Travel", "Reading", "Art"],
      relocationCities: ["Mumbai", "Pune"],
    });
    Object.assign(candidates[i], {
      city: "Mumbai",
      dob: `199${6 + i}-07-12`,
      height: 160 + i,
      income: (18 + i * 2) * 100000,
      wantKids: "Yes",
      relocate: "Yes",
      relocationCities: ["Bengaluru", "Pune"],
    });
  }
  // Deliberate unknowns exercise coverage and strict-policy exclusion behavior.
  candidates[19].income = null;
  candidates[22].wantKids = null;
  candidates[123].workStyle = null;
  candidates[123].timeline = null;
  const stages: Stage[] = [
    "Shortlisting",
    "Introductions",
    "Meeting",
    "Shortlisting",
    "Onboarding",
    "Profile verified",
    "Introductions",
    "Paused",
    "Meeting",
    "Shortlisting",
    "Closed",
    "Shortlisting",
  ];
  [...candidates, ...clients].forEach((p) => {
    addNarrative(p);
    profileSchema.parse(p);
  });
  return {
    candidates,
    clients,
    customers: clients.map((p, i) => ({
      id: `customer-${i + 1}`,
      profileId: p.id,
      ownerId: i < 10 ? demoUsers[0].id : demoUsers[1].id,
      stage: stages[i],
    })),
  };
}
