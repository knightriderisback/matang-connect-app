import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/getSession";
import { createAdminClient } from "@/lib/supabase/admin";
import bcrypt from "bcryptjs";

const NAMES = [
  "Ramesh Matang","Suresh Kumar","Anita Devi","Priya Sharma","Vikram Singh",
  "Sunita Bai","Rajesh Verma","Kavita Patel","Amit Yadav","Neha Gupta",
  "Deepak Sahu","Pooja Thakur","Manoj Das","Rekha Singh","Sanjay Tiwari",
  "Meena Kumari","Anil Chandrakar","Shweta Rao","Gopal Prasad","Lata Devi",
  "Harish Baghel","Kiran Netam","Ravi Kshatriya","Savita Markam","Naveen Sori",
  "Geeta Sidar","Prakash Dhruv","Usha Yadav","Mahesh Sahu","Anita Netam",
  "Sandeep Patel","Jyoti Verma","Bharat Kumar","Seema Bai","Dinesh Rao",
  "Pushpa Devi","Yogesh Tiwari","Manisha Sahu","Rohit Kumar","Asha Markam",
  "Kamlesh Yadav","Nirmala Devi","Ajay Baghel","Sunita Chandrakar","Vivek Das",
  "Radha Bai","Santosh Kumar","Preeti Sharma","Ganesh Prasad","Hemant Demo",
];
const VILLAGES = ["Pendri","Takhatpur","Kota","Masturi","Bilha","Sipat","Ratanpur","Koni","Belgahna","Lormi"];
const ROLES = ["normal","normal","normal","volunteer","normal","normal","core_committee","normal","volunteer","normal"];

/** Super Admin only — seeds demo members, posts, jobs, care, kosh */
export async function POST() {
  const session = await getSession();
  if (!session || session.role !== "super_admin") {
    return NextResponse.json({ error: "Super Admin only" }, { status: 403 });
  }

  const supabase = createAdminClient();
  const results: Record<string, number | string> = {};
  const pinHash = await bcrypt.hash("1234", 8);

  // City
  let cityId = session.cityId;
  if (!cityId) {
    const { data: c } = await supabase.from("cities").select("id").eq("name", "Bilaspur").limit(1).maybeSingle();
    cityId = c?.id || null;
  }
  if (!cityId) {
    const { data: c2 } = await supabase
      .from("cities")
      .insert({ name: "Bilaspur", state: "Chhattisgarh", is_active: true })
      .select("id")
      .single();
    cityId = c2?.id || null;
  }

  // 50 users
  let usersOk = 0;
  const userIds: string[] = [];
  for (let i = 1; i <= 50; i++) {
    const phone = `90000${String(i).padStart(5, "0")}`;
    const row = {
      full_name: NAMES[(i - 1) % NAMES.length],
      phone,
      m_pin_hash: pinHash,
      role: ROLES[(i - 1) % ROLES.length],
      city_id: cityId,
      native_village: VILLAGES[(i - 1) % VILLAGES.length],
      verification_status: i % 5 === 0 ? "pending" : "verified",
      qr_code_id: `MC-DEMO-${String(i).padStart(4, "0")}`,
    };
    const { data, error } = await supabase
      .from("users")
      .upsert(row, { onConflict: "phone" })
      .select("id")
      .maybeSingle();
    if (!error && data?.id) {
      usersOk++;
      userIds.push(data.id);
    }
  }
  results.users = usersOk;

  const poster = userIds[userIds.length - 1] || session.userId;

  // Notices
  const noticeRows = [
    { title: "Samaj Meeting — Sunday 10 AM", content: "Sabhi sadasya Sunday 10 baje Samaj Bhavan upasthit rahein.\nAgenda: Census, Kosh, youth plans.", type: "meeting" },
    { title: "Urgent: Blood needed (B+)", content: "Apollo Bilaspur — B+ blood turant.\nContact demo: 9000000001", type: "urgent" },
    { title: "Shok Sandesh — Shri Ramlal ji", content: "Shri Ramlal Matang ji (Pendri) ka swargwas.\nAntim yatra aaj sham 4 baje.\nOm Shanti.", type: "shok_sandesh" },
    { title: "Matang Yuva Rojgar Mela", content: "Rojgar Mela next month. Jobs module se register karein.", type: "announcement" },
    { title: "Kosh transparency update", content: "Is mahine income ₹45,000 / expense ₹22,000. Details Sahyog mein.", type: "general" },
    { title: "Mahila Shakti baithak", content: "Shaniwar 4 baje — skill training + micro finance.", type: "meeting" },
    { title: "Happy Diwali — Matang Samaj", content: "Sabhi parivaron ko Deepawali ki shubhkamnayein.", type: "announcement" },
    { title: "Census drive — pending families", content: "Is hafte volunteers pending families visit karenge.", type: "general" },
    { title: "Shok Sandesh — Smt. Kamla Bai", content: "Smt. Kamla Bai (Kota) — antim sanskar kal 9 baje.", type: "shok_sandesh" },
    { title: "Sports day registration", content: "Kabaddi + cricket. Gaurav points linked.", type: "announcement" },
    { title: "New Matrimony profiles", content: "5 naye biodata add hue — verified families.", type: "general" },
    { title: "Urgent: School fees support", content: "2 students ke liye sahyog. Care/Kosh se help karein.", type: "urgent" },
  ].map((n) => ({
    ...n,
    posted_by: poster,
    city_id: cityId,
  }));
  const { data: notices, error: nErr } = await supabase.from("notices").insert(noticeRows).select("id");
  results.notices = notices?.length || 0;
  if (nErr) results.notices_error = nErr.message;

  // Jobs
  const jobs = [
    { title: "Shop helper — market", description: "Full time 10–12k. Age 18–30." },
    { title: "Data entry WFH", description: "Part time census support." },
    { title: "Driver LMV", description: "Local trips, license required." },
    { title: "Tailoring instructor", description: "Women preferred, evening batch." },
    { title: "Warehouse packing", description: "Day shift + overtime." },
    { title: "Tuition Maths 9–10", description: "2 hrs daily near Takhatpur." },
  ].map((j) => ({ ...j, posted_by: poster, city_id: cityId, status: "active" }));
  const { data: jobData, error: jErr } = await supabase.from("jobs").insert(jobs).select("id");
  results.jobs = jobData?.length || 0;
  if (jErr) results.jobs_error = jErr.message;

  // Care
  const care = [
    { care_type: "medical", description: "Dialysis transport twice a week", urgency: "high", status: "open", notes: "Medical" },
    { care_type: "elderly", description: "Medicine reminder for grandmother", urgency: "normal", status: "open", notes: "Elder" },
    { care_type: "disability", description: "Wheelchair ramp at entrance", urgency: "normal", status: "in_progress", notes: "Access" },
    { care_type: "financial", description: "School admission fees one-time", urgency: "emergency", status: "open", notes: "Fees" },
    { care_type: "educational", description: "Class 12 science books", urgency: "low", status: "open", notes: "Books" },
    { care_type: "other", description: "House shifting help Bilaspur", urgency: "normal", status: "completed", notes: "Shift" },
  ].map((c) => ({ ...c, requester_id: poster }));
  const { data: careData, error: cErr } = await supabase.from("care_requests").insert(care).select("id");
  results.care = careData?.length || 0;
  if (cErr) results.care_error = cErr.message;

  // Kosh
  const txs = [
    { amount: 15000, category: "income", description: "Membership collection" },
    { amount: 5000, category: "donation", description: "Diwali drive" },
    { amount: 8000, category: "expense", description: "Medical support" },
    { amount: 2500, category: "expense", description: "Hall rent" },
    { amount: 12000, category: "income", description: "Fundraising" },
    { amount: 3000, category: "expense", description: "Sports kit" },
  ].map((t) => ({ ...t, recorded_by: poster }));
  const { data: txData, error: tErr } = await supabase.from("kosh_transactions").insert(txs).select("id");
  results.kosh_tx = txData?.length || 0;
  if (tErr) results.kosh_error = tErr.message;

  const contribs = userIds.slice(0, 15).map((id, idx) => ({
    contributor_id: id,
    amount: 500 + idx * 100,
    purpose: "Sahyog contribution",
  }));
  const { data: contribData } = await supabase.from("sahyog_kosh_contributions").insert(contribs).select("id");
  results.contributions = contribData?.length || 0;

  results.note = "Demo M-PIN for 90000xxxxx users: 1234";
  return NextResponse.json({ success: true, results });
}
