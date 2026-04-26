/* Threat data for THREATGRID lives here as the single source of truth for all active and future layers. */
const threats = [
  {
    id: "tg-001",
    type: "ransomware",
    severity: "critical",
    title: "Hospital Network Lockout",
    location: { lat: 40.7128, lng: -74.0060, city: "New York", country: "USA" },
    status: "active"
  },
  {
    id: "tg-002",
    type: "phishing",
    severity: "medium",
    title: "Credential Harvest Cluster",
    location: { lat: -23.5505, lng: -46.6333, city: "Sao Paulo", country: "Brazil" },
    status: "active"
  },
  {
    id: "tg-003",
    type: "ddos",
    severity: "high",
    title: "Transit Gateway Flood",
    location: { lat: 51.5072, lng: -0.1276, city: "London", country: "United Kingdom" },
    status: "active"
  },
  {
    id: "tg-004",
    type: "botnet",
    severity: "low",
    title: "IoT Beacon Swarm",
    location: { lat: 6.5244, lng: 3.3792, city: "Lagos", country: "Nigeria" },
    status: "active"
  },
  {
    id: "tg-005",
    type: "zero-day",
    severity: "critical",
    title: "Kernel Exploit Propagation",
    location: { lat: 35.6762, lng: 139.6503, city: "Tokyo", country: "Japan" },
    status: "active"
  },
  {
    id: "tg-006",
    type: "trojan",
    severity: "medium",
    title: "Banking Trojan Relay",
    location: { lat: 25.2048, lng: 55.2708, city: "Dubai", country: "UAE" },
    status: "active"
  },
  {
    id: "tg-007",
    type: "ddos",
    severity: "high",
    title: "Subsea Cable Saturation",
    location: { lat: -33.9249, lng: 18.4241, city: "Cape Town", country: "South Africa" },
    status: "active"
  },
  {
    id: "tg-008",
    type: "phishing",
    severity: "low",
    title: "Regional Mail Spoof Wave",
    location: { lat: -33.8688, lng: 151.2093, city: "Sydney", country: "Australia" },
    status: "active"
  }
];
