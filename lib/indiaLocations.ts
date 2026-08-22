/** India states/UTs + major cities (static). Used when DB has few rows. */
export const INDIA_STATE_CITIES: Record<string, string[]> = {
  "Chhattisgarh": ["Akaltara", "Ambikapur", "Balod", "Baloda Bazar", "Balrampur", "Bastar", "Bemetara", "Bhilai", "Bijapur", "Bilaspur", "Champa", "Chirmiri", "Dantewada", "Dhamtari", "Dipka", "Dongargarh", "Durg", "Gariaband", "Jagdalpur", "Janjgir", "Jashpur", "Kanker", "Katghora", "Kawardha", "Khairagarh", "Kondagaon", "Korba", "Korea", "Lundra", "Mahasamund", "Manendragarh", "Mungeli", "Naila", "Narayanpur", "Pathalgaon", "Pendraroad", "Premnagar", "Raigarh", "Raipur", "Rajnandgaon", "Ramanujganj", "Sakti", "Saraipali", "Sukma", "Surajpur"],
  "Andaman and Nicobar Islands": ["Car Nicobar", "Diglipur", "Hut Bay", "Mayabunder", "Port Blair"],
  "Andhra Pradesh": ["Adoni", "Anantapur", "Bhimavaram", "Chilakaluripet", "Dharmavaram", "Eluru", "Gudivada", "Guntakal", "Guntur", "Hindupur", "Kadapa", "Kakinada", "Kurnool", "Machilipatnam", "Madanapalle", "Mangalagiri", "Nandyal", "Narasaraopet", "Nellore", "Ongole", "Proddatur", "Rajahmundry", "Tadipatri", "Tenali", "Tirupati", "Vijayawada", "Visakhapatnam"],
  "Arunachal Pradesh": ["Aalo", "Bomdila", "Changlang", "Itanagar", "Khonsa", "Naharlagun", "Pasighat", "Tawang", "Tezu", "Ziro"],
  "Assam": ["Barpeta", "Bongaigaon", "Dhubri", "Dibrugarh", "Diphu", "Goalpara", "Golaghat", "Guwahati", "Haflong", "Jorhat", "Karimganj", "Lakhimpur", "Nagaon", "Silchar", "Sivasagar", "Tezpur", "Tinsukia"],
  "Bihar": ["Arrah", "Aurangabad", "Baghraich", "Begusarai", "Bettiah", "Bhagalpur", "Bihar Sharif", "Buxar", "Chhapra", "Danapur", "Darbhanga", "Dehri", "Gaya", "Hajipur", "Jehanabad", "Katihar", "Madhubani", "Motihari", "Munger", "Muzaffarpur", "Nawada", "Patna", "Purnia", "Saharsa", "Samastipur", "Sasaram", "Sitamarhi", "Siwan"],
  "Chandigarh": ["Chandigarh"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Amli", "Daman", "Diu", "Silvassa"],
  "Delhi": ["Central Delhi", "Delhi", "Dwarka", "East Delhi", "Narela", "New Delhi", "North Delhi", "Rohini", "Shahdara", "South Delhi", "West Delhi"],
  "Goa": ["Bicholim", "Canacona", "Curchorem", "Mapusa", "Margao", "Panaji", "Ponda", "Vasco da Gama"],
  "Gujarat": ["Ahmedabad", "Amreli", "Anand", "Bharuch", "Bhavnagar", "Bhuj", "Botad", "Dahod", "Deesa", "Gandhinagar", "Godhra", "Jamnagar", "Jetpur", "Junagadh", "Kalol", "Mehsana", "Morbi", "Nadiad", "Navsari", "Palanpur", "Patan", "Porbandar", "Rajkot", "Surat", "Surendranagar", "Vadodara", "Valsad", "Vapi", "Veraval"],
  "Haryana": ["Ambala", "Bahadurgarh", "Bhiwani", "Faridabad", "Fatehabad", "Gurugram", "Hisar", "Jind", "Kaithal", "Karnal", "Narnaul", "Narwana", "Palwal", "Panchkula", "Panipat", "Rewari", "Rohtak", "Sirsa", "Sonipat", "Thanesar", "Tohana", "Yamunanagar"],
  "Himachal Pradesh": ["Baddi", "Bilaspur", "Chamba", "Dharamshala", "Hamirpur", "Kangra", "Kullu", "Mandi", "Nahan", "Palampur", "Paonta Sahib", "Shimla", "Solan", "Sundernagar", "Una"],
  "Jammu and Kashmir": ["Anantnag", "Baramulla", "Budgam", "Ganderbal", "Jammu", "Kathua", "Kupwara", "Punch", "Rajauri", "Sopore", "Srinagar", "Udhampur"],
  "Jharkhand": ["Bokaro", "Chaibasa", "Chirkunda", "Deoghar", "Dhanbad", "Dumka", "Giridih", "Gumla", "Hazaribagh", "Jamshedpur", "Medininagar", "Phusro", "Ramgarh", "Ranchi", "Sahibganj"],
  "Karnataka": ["Bagalkot", "Ballari", "Belagavi", "Bengaluru", "Bhadravati", "Bidar", "Chikkamagaluru", "Chitradurga", "Davanagere", "Gangavati", "Hassan", "Hospet", "Hubballi", "Kalaburagi", "Kolar", "Mandya", "Mangaluru", "Mysuru", "Raichur", "Ranebennuru", "Robertson Pet", "Shivamogga", "Tumakuru", "Udupi", "Vijayapura"],
  "Kerala": ["Alappuzha", "Guruvayur", "Kanhangad", "Kannur", "Kayamkulam", "Kochi", "Kollam", "Kottayam", "Kozhikode", "Malappuram", "Manjeri", "Nedumangad", "Palakkad", "Ponnani", "Thalassery", "Thiruvananthapuram", "Thrissur", "Vatakara"],
  "Ladakh": ["Diskit", "Kargil", "Leh", "Nubra"],
  "Lakshadweep": ["Agatti", "Amini", "Andrott", "Kavaratti", "Minicoy"],
  "Madhya Pradesh": ["Betul", "Bhind", "Bhopal", "Burhanpur", "Chhindwara", "Damoh", "Dewas", "Guna", "Gwalior", "Hoshangabad", "Indore", "Itarsi", "Jabalpur", "Khandwa", "Khargone", "Mandsaur", "Morena", "Murwara", "Neemuch", "Pithampur", "Ratlam", "Rewa", "Sagar", "Satna", "Sehore", "Shivpuri", "Singrauli", "Ujjain", "Vidisha"],
  "Maharashtra": ["Achalpur", "Ahmednagar", "Akola", "Amravati", "Aurangabad", "Barshi", "Beed", "Bhusawal", "Chandrapur", "Dhule", "Gondia", "Hinganghat", "Ichalkaranji", "Jalgaon", "Jalna", "Kamptee", "Kolhapur", "Latur", "Malegaon", "Mumbai", "Nagpur", "Nanded", "Nandurbar", "Nashik", "Navi Mumbai", "Osmanabad", "Panvel", "Parbhani", "Pune", "Sangli", "Satara", "Solapur", "Thane", "Udgir", "Wardha", "Yavatmal"],
  "Manipur": ["Bishnupur", "Churachandpur", "Imphal", "Jiribam", "Kakching", "Senapati", "Tamenglong", "Thoubal", "Ukhrul"],
  "Meghalaya": ["Baghmara", "Jowai", "Mairang", "Nongpoh", "Resubelpara", "Shillong", "Tura", "Williamnagar"],
  "Mizoram": ["Aizawl", "Champhai", "Kolasib", "Lawngtlai", "Lunglei", "Mamit", "Saiha", "Serchhip"],
  "Nagaland": ["Dimapur", "Kiphire", "Kohima", "Mokokchung", "Mon", "Phek", "Tuensang", "Wokha", "Zunheboto"],
  "Odisha": ["Angul", "Balasore", "Barbil", "Bargarh", "Baripada", "Berhampur", "Bhadrak", "Bhawanipatna", "Bhubaneswar", "Cuttack", "Dhenkanal", "Jeypore", "Jharsuguda", "Paradeep", "Puri", "Rayagada", "Rourkela", "Sambalpur"],
  "Puducherry": ["Karaikal", "Mahe", "Puducherry", "Yanam"],
  "Punjab": ["Abohar", "Amritsar", "Barnala", "Batala", "Bathinda", "Firozpur", "Hoshiarpur", "Jalandhar", "Kapurthala", "Khanna", "Ludhiana", "Malerkotla", "Moga", "Mohali", "Muktsar", "Pathankot", "Patiala", "Phagwara", "Rajpura"],
  "Rajasthan": ["Ajmer", "Alwar", "Banswara", "Baran", "Barmer", "Beawar", "Bharatpur", "Bhilwara", "Bikaner", "Bundi", "Chittorgarh", "Churu", "Dhaulpur", "Dungarpur", "Gangapur City", "Hanumangarh", "Jaipur", "Jaisalmer", "Jhunjhunu", "Jodhpur", "Kishangarh", "Kota", "Nagaur", "Pali", "Sawai Madhopur", "Sikar", "Sri Ganganagar", "Tonk", "Udaipur"],
  "Sikkim": ["Gangtok", "Gyalshing", "Jorethang", "Mangan", "Namchi", "Rangpo"],
  "Tamil Nadu": ["Ambur", "Chennai", "Coimbatore", "Dindigul", "Erode", "Gudiyatham", "Hosur", "Kanchipuram", "Karur", "Kumbakonam", "Madurai", "Nagapattinam", "Nagercoil", "Pollachi", "Pudukkottai", "Rajapalayam", "Ranipet", "Salem", "Sivakasi", "Thanjavur", "Thoothukudi", "Tiruchirappalli", "Tirunelveli", "Tiruppur", "Tiruvannamalai", "Udhagamandalam", "Vaniyambadi", "Vellore"],
  "Telangana": ["Adilabad", "Hyderabad", "Jagtial", "Karimnagar", "Khammam", "Mahbubnagar", "Mancherial", "Miryalaguda", "Nalgonda", "Nirmal", "Nizamabad", "Ramagundam", "Siddipet", "Suryapet", "Warangal"],
  "Tripura": ["Agartala", "Ambassa", "Belonia", "Dharmanagar", "Kailashahar", "Khowai", "Sabroom", "Udaipur"],
  "Uttar Pradesh": ["Agra", "Akbarpur", "Aligarh", "Amroha", "Awagarh", "Ayodhya", "Azamgarh", "Bahraich", "Ballia", "Banda", "Barabanki", "Bareilly", "Basti", "Bijnor", "Bulandshahr", "Chandausi", "Deoria", "Etah", "Etawah", "Farrukhabad", "Fatehpur", "Firozabad", "Ghaziabad", "Ghazipur", "Gonda", "Gorakhpur", "Greater Noida", "Hapur", "Hardoi", "Hathras", "Jaunpur", "Jhansi", "Kanpur", "Kasganj", "Khurja", "Lakhimpur", "Lalitpur", "Lucknow", "Mainpuri", "Mathura", "Maunath Bhanjan", "Meerut", "Mirzapur", "Modinagar", "Moradabad", "Muzaffarnagar", "Noida", "Orai", "Pilibhit", "Prayagraj", "Raebareli", "Rampur", "Saharanpur", "Sahaswan", "Sambhal", "Shahjahanpur", "Shamli", "Shikohabad", "Sitapur", "Sultanpur", "Tanda", "Unnao", "Varanasi"],
  "Uttarakhand": ["Almora", "Dehradun", "Haldwani", "Haridwar", "Jaspur", "Kashipur", "Kotdwar", "Manglaur", "Mussoorie", "Nainital", "Pithoragarh", "Ramnagar", "Rishikesh", "Roorkee", "Rudrapur", "Srinagar"],
  "West Bengal": ["Alipurduar", "Asansol", "Baharampur", "Balurghat", "Bangaon", "Bankura", "Bardhaman", "Basirhat", "Chakdaha", "Dankuni", "Darjeeling", "Dhulian", "Durgapur", "Habra", "Haldia", "Howrah", "Jalpaiguri", "Jangipur", "Kharagpur", "Kolkata", "Krishnanagar", "Malda", "Medinipur", "Nabadwip", "Purulia", "Raiganj", "Ranaghat", "Shantipur", "Siliguri"],
};

export const INDIA_STATES: string[] = Object.keys(INDIA_STATE_CITIES).sort((a, b) => {
  if (a === "Chhattisgarh") return -1;
  if (b === "Chhattisgarh") return 1;
  return a.localeCompare(b);
});

export type IndiaCityOption = { id: string; name: string; state: string };

export function staticCityId(state: string, name: string): string {
  return `static:${state}|${name}`;
}

export function parseStaticCityId(id: string): { state: string; name: string } | null {
  if (!id.startsWith("static:")) return null;
  const rest = id.slice(7);
  const i = rest.indexOf("|");
  if (i < 0) return null;
  return { state: rest.slice(0, i), name: rest.slice(i + 1) };
}

export function allIndiaCityOptions(): IndiaCityOption[] {
  const out: IndiaCityOption[] = [];
  for (const state of INDIA_STATES) {
    for (const name of INDIA_STATE_CITIES[state] || []) {
      out.push({ id: staticCityId(state, name), name, state });
    }
  }
  return out;
}
