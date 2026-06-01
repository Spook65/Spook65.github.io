/* Threat data for THREATGRID lives here as the single source of truth for all active and future layers. */
const threats = [
  {
    id: "tg-001",
    type: "ransomware",
    severity: "critical",
    title: "Hospital Network Lockout",
    location: { lat: 40.7128, lng: -74.0060, city: "New York", country: "USA" },
    target: "Hospital network",
    vector: "Phishing email attachment",
    description: "Initial access was likely gained through a weaponized invoice attachment delivered to clinical staff. The payload is now encrypting radiology workstations and attempting lateral movement into electronic health record infrastructure. Recovery urgency is high because patient scheduling, imaging, and medication workflows are already degrading.",
    iocs: [
      "Mass file renames ending in .ryuklock",
      "SMB beaconing from radiology VLAN to domain controllers",
      "New scheduled task named Windows Backup Health"
    ],
    affectedSystems: [
      "Radiology workstations",
      "Electronic health record servers",
      "Active Directory domain controllers"
    ],
    status: "active",
    combatType: "offense",
    level: 4,
    hp: 118,
    maxHp: 118,
    atk: 6,
    def: 4,
    spd: 5,
    weakType: "defense",
    weakPoint: "isolate",
    intentTags: ["swarm", "spread", "lockout"],
    weakTo: ["isolate", "countertrace"],
    resists: ["purge"],
    immuneTo: ["bait"],
    abilities: [
      { name: "Encrypt Files", cost: 0, baseDamage: 20, effect: "status_encrypted" },
      { name: "Spread Network", cost: 1, baseDamage: 12, effect: "damage_all" },
      { name: "Escalate", cost: 2, baseDamage: 0, effect: "self_level_up" }
    ]
  },
  {
    id: "tg-002",
    type: "phishing",
    severity: "medium",
    title: "Credential Harvest Cluster",
    location: { lat: -23.5505, lng: -46.6333, city: "Sao Paulo", country: "Brazil" },
    target: "Regional payment processors",
    vector: "Spoofed single sign-on portal",
    description: "A coordinated phishing wave is impersonating cloud identity providers used by finance teams in Sao Paulo. Victims are being redirected to cloned login pages that proxy passwords and session tokens in real time. Current telemetry suggests the campaign is focused on payroll and treasury roles.",
    iocs: [
      "Lookalike domain using sso-secure-brazil.com",
      "Repeated OAuth token requests from unfamiliar ASN",
      "Inbound messages with HTML smuggling attachments"
    ],
    affectedSystems: [
      "Corporate email accounts",
      "Single sign-on portals",
      "Finance department endpoints"
    ],
    status: "active",
    combatType: "deception",
    level: 2,
    hp: 88,
    maxHp: 88,
    atk: 4,
    def: 3,
    spd: 8,
    weakType: "offense",
    weakPoint: "revoke",
    intentTags: ["deceive", "harvest", "redirect"],
    weakTo: ["scan", "reveal", "countertrace"],
    resists: ["redirect"],
    immuneTo: [],
    abilities: [
      { name: "Harvest Credentials", cost: 0, baseDamage: 14, effect: "status_detected" },
      { name: "Spoof Tenant", cost: 1, baseDamage: 10, effect: "damage_all" },
      { name: "Escalate", cost: 2, baseDamage: 0, effect: "self_level_up" }
    ]
  },
  {
    id: "tg-003",
    type: "ddos",
    severity: "high",
    title: "Transit Gateway Flood",
    location: { lat: 51.5072, lng: -0.1276, city: "London", country: "United Kingdom" },
    target: "Transit gateway edge routers",
    vector: "Volumetric UDP amplification",
    description: "Edge telemetry indicates a sustained volumetric denial-of-service event targeting transit gateway infrastructure serving London exchanges. The traffic mix is dominated by reflected UDP payloads, with spikes consistent with CLDAP and NTP amplification. If the flood persists, downstream enterprise customers will start losing session stability across multiple carriers.",
    iocs: [
      "Inbound UDP surge above baseline by 430 percent",
      "Source distribution concentrated in open resolver networks",
      "Sustained CLDAP reflection signatures on port 389"
    ],
    affectedSystems: [
      "Border routers",
      "Transit gateway load balancers",
      "Customer-facing edge links"
    ],
    status: "active",
    combatType: "offense",
    level: 3,
    hp: 98,
    maxHp: 98,
    atk: 5,
    def: 4,
    spd: 6,
    weakType: "purge",
    weakPoint: "reroute",
    intentTags: ["swarm", "flood", "saturate"],
    weakTo: ["mitigate", "redirect", "isolate"],
    resists: ["purge"],
    immuneTo: ["decoy"],
    abilities: [
      { name: "Amplify Flood", cost: 0, baseDamage: 18, effect: "damage_all" },
      { name: "Fragment Route", cost: 1, baseDamage: 14, effect: "status_isolated" },
      { name: "Escalate", cost: 2, baseDamage: 0, effect: "self_level_up" }
    ]
  },
  {
    id: "tg-004",
    type: "botnet",
    severity: "low",
    title: "IoT Beacon Swarm",
    location: { lat: 6.5244, lng: 3.3792, city: "Lagos", country: "Nigeria" },
    target: "Consumer IoT camera fleet",
    vector: "Default credential abuse",
    description: "Low-volume beaconing suggests a botnet is quietly enrolling internet-exposed IoT devices in the Lagos region. Most callbacks are short lived and originate from poorly secured camera and DVR installations still using factory credentials. The activity is early stage but could be weaponized into a larger command-and-control cluster if left unchecked.",
    iocs: [
      "Outbound telnet attempts to known malware controllers",
      "Frequent DNS lookups for rotating dynamic DNS hosts",
      "Mirai-like process names on exposed DVR consoles"
    ],
    affectedSystems: [
      "IP cameras",
      "DVR appliances",
      "Small-office edge gateways"
    ],
    status: "active",
    combatType: "deception",
    level: 1,
    hp: 70,
    maxHp: 70,
    atk: 3,
    def: 2,
    spd: 9,
    weakType: "purge",
    weakPoint: "sinkhole",
    intentTags: ["swarm", "beacon", "spread"],
    weakTo: ["scan", "isolate", "purge"],
    resists: ["redirect"],
    immuneTo: [],
    abilities: [
      { name: "Beacon C2", cost: 0, baseDamage: 12, effect: "status_detected" },
      { name: "Multiply Nodes", cost: 1, baseDamage: 10, effect: "damage_all" },
      { name: "Reinfect", cost: 2, baseDamage: 0, effect: "self_level_up" }
    ]
  },
  {
    id: "tg-005",
    type: "zero-day",
    severity: "critical",
    title: "Kernel Exploit Propagation",
    location: { lat: 35.6762, lng: 139.6503, city: "Tokyo", country: "Japan" },
    target: "Financial trading servers",
    vector: "Unpatched kernel privilege escalation",
    description: "Incident data points to an in-the-wild kernel zero-day being chained with a remote foothold inside Tokyo-based trading environments. Once initial access is established, the exploit elevates to system privileges and disables endpoint controls before spreading. The attacker appears to be pursuing persistence on latency-sensitive servers that support order routing and market data handling.",
    iocs: [
      "Unexpected unsigned kernel module loads",
      "Endpoint protection service termination events",
      "Crash dumps referencing ntoskrnl privilege checks"
    ],
    affectedSystems: [
      "Trading application servers",
      "Market data collectors",
      "Privileged jump hosts"
    ],
    status: "active",
    combatType: "purge",
    level: 6,
    hp: 138,
    maxHp: 138,
    atk: 7,
    def: 5,
    spd: 7,
    weakType: "offense",
    weakPoint: "patch",
    intentTags: ["escalate", "corrupt", "breach"],
    weakTo: ["countertrace", "cleanse", "mitigate"],
    resists: ["decoy"],
    immuneTo: ["bait"],
    abilities: [
      { name: "Privilege Escalate", cost: 0, baseDamage: 22, effect: "status_encrypted" },
      { name: "Disable EDR", cost: 1, baseDamage: 18, effect: "damage_all" },
      { name: "Kernel Chain", cost: 2, baseDamage: 0, effect: "self_level_up" }
    ]
  },
  {
    id: "tg-006",
    type: "trojan",
    severity: "medium",
    title: "Banking Trojan Relay",
    location: { lat: 25.2048, lng: 55.2708, city: "Dubai", country: "UAE" },
    target: "Retail banking endpoints",
    vector: "Malvertising drive-by download",
    description: "A banking trojan cluster is relaying staged payloads through compromised advertising infrastructure targeting browsers in the Dubai financial corridor. Infected systems are establishing encrypted outbound sessions, injecting fake login forms, and harvesting browser-stored credentials. The operation remains contained but the malware family is capable of account takeover and fraudulent wire initiation.",
    iocs: [
      "Encrypted callbacks to rotating CDN subdomains",
      "Injected browser process with unusual DLL sideload path",
      "Registry run key named SecureBrowserUpdate"
    ],
    affectedSystems: [
      "Retail banker laptops",
      "Customer service desktops",
      "Shared browser session hosts"
    ],
    status: "active",
    combatType: "offense",
    level: 3,
    hp: 94,
    maxHp: 94,
    atk: 5,
    def: 3,
    spd: 6,
    weakType: "purge",
    weakPoint: "isolate",
    intentTags: ["stealth", "harvest", "persist"],
    weakTo: ["scan", "cleanse", "isolate"],
    resists: ["redirect"],
    immuneTo: [],
    abilities: [
      { name: "Inject Form", cost: 0, baseDamage: 15, effect: "status_detected" },
      { name: "Steal Sessions", cost: 1, baseDamage: 13, effect: "damage_all" },
      { name: "Reconnect", cost: 2, baseDamage: 0, effect: "self_level_up" }
    ]
  },
  {
    id: "tg-007",
    type: "ddos",
    severity: "high",
    title: "Subsea Cable Saturation",
    location: { lat: -33.9249, lng: 18.4241, city: "Cape Town", country: "South Africa" },
    target: "Subsea cable landing network",
    vector: "SYN flood and GRE spray",
    description: "Cape Town telemetry shows a multi-vector denial-of-service campaign focused on links servicing a subsea cable landing network. The attacker is mixing SYN floods with GRE encapsulated traffic to exhaust upstream filtering capacity and congest aggregation devices. Regional latency has already begun to rise for enterprise tenants relying on those paths for international transit.",
    iocs: [
      "SYN queue exhaustion on coastal edge firewalls",
      "GRE tunnel packets from spoofed global address space",
      "Abrupt packet loss on saturation-prone peering links"
    ],
    affectedSystems: [
      "Peering firewalls",
      "Aggregation switches",
      "International transit circuits"
    ],
    status: "active",
    combatType: "offense",
    level: 5,
    hp: 112,
    maxHp: 112,
    atk: 6,
    def: 4,
    spd: 6,
    weakType: "defense",
    weakPoint: "divert",
    intentTags: ["swarm", "saturate", "disrupt"],
    weakTo: ["mitigate", "redirect", "isolate"],
    resists: ["purge"],
    immuneTo: ["decoy"],
    abilities: [
      { name: "Saturate Peering", cost: 0, baseDamage: 19, effect: "damage_all" },
      { name: "GRE Spray", cost: 1, baseDamage: 15, effect: "status_isolated" },
      { name: "Escalate", cost: 2, baseDamage: 0, effect: "self_level_up" }
    ]
  },
  {
    id: "tg-008",
    type: "phishing",
    severity: "low",
    title: "Regional Mail Spoof Wave",
    location: { lat: -33.8688, lng: 151.2093, city: "Sydney", country: "Australia" },
    target: "Regional government mail users",
    vector: "Spoofed password reset campaign",
    description: "A low-severity phishing wave is spoofing internal password reset notices across public-sector mailboxes in Sydney. Most messages are unsophisticated, but several include convincing branding and short-lived redirect chains that obscure the final credential capture page. The campaign is still early and can likely be contained with rapid filtering and user notification.",
    iocs: [
      "Messages failing DMARC but passing display-name trust checks",
      "Redirect chains through compromised WordPress sites",
      "Login prompts hosted behind shortened URL services"
    ],
    affectedSystems: [
      "Government email tenants",
      "User identity portals",
      "Shared webmail access terminals"
    ],
    status: "active",
    combatType: "deception",
    level: 1,
    hp: 74,
    maxHp: 74,
    atk: 3,
    def: 2,
    spd: 7,
    weakType: "offense",
    weakPoint: "inspect",
    intentTags: ["deceive", "redirect", "harvest"],
    weakTo: ["scan", "reveal", "countertrace"],
    resists: ["redirect"],
    immuneTo: [],
    abilities: [
      { name: "Reset Request", cost: 0, baseDamage: 11, effect: "status_detected" },
      { name: "Redirect Chain", cost: 1, baseDamage: 9, effect: "damage_all" },
      { name: "Escalate", cost: 2, baseDamage: 0, effect: "self_level_up" }
    ]
  }
];
