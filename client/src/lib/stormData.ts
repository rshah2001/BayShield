// ============================================================
// STORMMESH — Simulation Data & Types
// Design: Bioluminescent Storm — deep ocean dark base with glowing organic data
// ============================================================

export type ThreatLevel = 'monitoring' | 'advisory' | 'warning' | 'critical';
export type AgentStatus = 'idle' | 'active' | 'processing' | 'complete' | 'error';

export interface WeatherData {
  stormName: string;
  category: number;
  windSpeed: number;
  pressure: number;
  lat: number;
  lng: number;
  movement: string;
  landfall: string;
  threatLevel: ThreatLevel;
  radarReturns: number;
  surgeHeight: number;
}

export interface VulnerabilityZone {
  id: string;
  name: string;
  floodZone: 'A' | 'AE' | 'VE' | 'X';
  population: number;
  elderlyPct: number;
  lowIncomePct: number;
  mobilityImpairedPct: number;
  riskScore: number;
  lat: number;
  lng: number;
  status: 'safe' | 'watch' | 'warning' | 'evacuate';
}

export interface Resource {
  id: string;
  type: 'shelter' | 'supply_depot' | 'medical' | 'evacuation_route';
  name: string;
  capacity: number;
  currentOccupancy: number;
  status: 'available' | 'filling' | 'full' | 'closed';
  lat: number;
  lng: number;
  supplies?: string[];
}

export interface Alert {
  id: string;
  timestamp: Date;
  priority: 'info' | 'advisory' | 'warning' | 'critical';
  zone: string;
  message: string;
  agentSource: string;
  actionRequired: string;
  population: number;
}

export interface AgentMessage {
  id: string;
  from: string;
  to: string;
  timestamp: Date;
  type: 'data' | 'request' | 'response' | 'alert';
  content: string;
  status: 'sent' | 'received' | 'processing' | 'acknowledged';
}

export interface AgentState {
  id: string;
  name: string;
  role: string;
  status: AgentStatus;
  lastAction: string;
  loopCount: number;
  confidence: number;
  processingTime: number;
  color: string;
  glowClass: string;
  icon: string;
}

// Tampa Bay neighborhoods with vulnerability data
export const VULNERABILITY_ZONES: VulnerabilityZone[] = [
  {
    id: 'zone-1',
    name: 'Pinellas Point',
    floodZone: 'VE',
    population: 8420,
    elderlyPct: 42,
    lowIncomePct: 28,
    mobilityImpairedPct: 18,
    riskScore: 94,
    lat: 27.7052,
    lng: -82.6762,
    status: 'evacuate'
  },
  {
    id: 'zone-2',
    name: 'Davis Islands',
    floodZone: 'AE',
    population: 5100,
    elderlyPct: 22,
    lowIncomePct: 8,
    mobilityImpairedPct: 10,
    riskScore: 87,
    lat: 27.9204,
    lng: -82.4548,
    status: 'evacuate'
  },
  {
    id: 'zone-3',
    name: 'Gandy Bridge Area',
    floodZone: 'AE',
    population: 12300,
    elderlyPct: 31,
    lowIncomePct: 35,
    mobilityImpairedPct: 22,
    riskScore: 82,
    lat: 27.9044,
    lng: -82.5168,
    status: 'warning'
  },
  {
    id: 'zone-4',
    name: 'Ybor City',
    floodZone: 'X',
    population: 18700,
    elderlyPct: 18,
    lowIncomePct: 52,
    mobilityImpairedPct: 14,
    riskScore: 71,
    lat: 27.9600,
    lng: -82.4389,
    status: 'warning'
  },
  {
    id: 'zone-5',
    name: 'Seminole Heights',
    floodZone: 'X',
    population: 22100,
    elderlyPct: 15,
    lowIncomePct: 38,
    mobilityImpairedPct: 11,
    riskScore: 58,
    lat: 27.9894,
    lng: -82.4673,
    status: 'watch'
  },
  {
    id: 'zone-6',
    name: 'St. Pete Beach',
    floodZone: 'VE',
    population: 9800,
    elderlyPct: 48,
    lowIncomePct: 15,
    mobilityImpairedPct: 25,
    riskScore: 96,
    lat: 27.7256,
    lng: -82.7401,
    status: 'evacuate'
  },
  {
    id: 'zone-7',
    name: 'Clearwater Beach',
    floodZone: 'VE',
    population: 11200,
    elderlyPct: 44,
    lowIncomePct: 12,
    mobilityImpairedPct: 20,
    riskScore: 93,
    lat: 27.9784,
    lng: -82.8279,
    status: 'evacuate'
  },
  {
    id: 'zone-8',
    name: 'Brandon',
    floodZone: 'X',
    population: 45600,
    elderlyPct: 12,
    lowIncomePct: 22,
    mobilityImpairedPct: 8,
    riskScore: 32,
    lat: 27.9378,
    lng: -82.2859,
    status: 'safe'
  }
];

export const RESOURCES: Resource[] = [
  {
    id: 'res-1',
    type: 'shelter',
    name: 'USF Sun Dome',
    capacity: 8000,
    currentOccupancy: 2340,
    status: 'available',
    lat: 28.0641,
    lng: -82.4148,
    supplies: ['Water', 'MREs', 'Medical', 'Cots', 'Generator']
  },
  {
    id: 'res-2',
    type: 'shelter',
    name: 'Yuengling Center',
    capacity: 10000,
    currentOccupancy: 5800,
    status: 'filling',
    lat: 28.0641,
    lng: -82.4148,
    supplies: ['Water', 'MREs', 'Cots', 'Pet-Friendly']
  },
  {
    id: 'res-3',
    type: 'shelter',
    name: 'Tropicana Field',
    capacity: 12000,
    currentOccupancy: 9100,
    status: 'filling',
    lat: 27.7683,
    lng: -82.6534,
    supplies: ['Water', 'MREs', 'Medical', 'Special Needs']
  },
  {
    id: 'res-4',
    type: 'supply_depot',
    name: 'FEMA Depot — I-75 Hub',
    capacity: 50000,
    currentOccupancy: 0,
    status: 'available',
    lat: 27.9506,
    lng: -82.2012,
    supplies: ['Water (50K gal)', 'MREs (100K)', 'Tarps', 'Generators', 'Medical Kits']
  },
  {
    id: 'res-5',
    type: 'medical',
    name: 'Tampa General Hospital',
    capacity: 1040,
    currentOccupancy: 780,
    status: 'filling',
    lat: 27.9204,
    lng: -82.4548,
    supplies: ['Trauma', 'ICU', 'Surge Capacity']
  },
  {
    id: 'res-6',
    type: 'evacuation_route',
    name: 'I-75 North Contraflow',
    capacity: 99999,
    currentOccupancy: 0,
    status: 'available',
    lat: 27.9506,
    lng: -82.3012
  },
  {
    id: 'res-7',
    type: 'evacuation_route',
    name: 'I-4 East Contraflow',
    capacity: 99999,
    currentOccupancy: 0,
    status: 'available',
    lat: 27.9506,
    lng: -82.3012
  }
];

export const INITIAL_WEATHER: WeatherData = {
  stormName: 'Hurricane Helena',
  category: 4,
  windSpeed: 145,
  pressure: 942,
  lat: 25.2,
  lng: -84.1,
  movement: 'NNW at 14 mph',
  landfall: '18-22 hours',
  threatLevel: 'critical',
  radarReturns: 87,
  surgeHeight: 12
};

export const AGENT_MESSAGES_SEQUENCE: Omit<AgentMessage, 'id' | 'timestamp'>[] = [
  {
    from: 'Storm Watcher',
    to: 'System',
    type: 'alert',
    content: 'NOAA NHC update: Hurricane Helena Cat-4, 145kt winds. Projected landfall Tampa Bay in 18-22hrs. Initiating threat cascade...',
    status: 'sent'
  },
  {
    from: 'Storm Watcher',
    to: 'Vulnerability Mapper',
    type: 'request',
    content: 'A2A REQUEST: Threat level CRITICAL. Wind field 60mi radius. Surge potential 10-14ft. Begin vulnerability analysis for coastal zones immediately.',
    status: 'sent'
  },
  {
    from: 'Storm Watcher',
    to: 'Resource Coordinator',
    type: 'request',
    content: 'A2A REQUEST: Parallel activation. Surge zones A/AE/VE require immediate resource pre-positioning. Coordinate with Vulnerability Mapper output.',
    status: 'sent'
  },
  {
    from: 'Vulnerability Mapper',
    to: 'Storm Watcher',
    type: 'response',
    content: 'ANALYSIS COMPLETE: 6 high-risk zones identified. 47,520 residents in surge zones. Critical: 18,400 elderly/mobility-impaired require assisted evacuation.',
    status: 'received'
  },
  {
    from: 'Resource Coordinator',
    to: 'Storm Watcher',
    type: 'response',
    content: 'LOGISTICS READY: 3 shelters activated (30,000 cap). I-75/I-4 contraflow authorized. FEMA depot pre-staged. 12 medical teams deployed.',
    status: 'received'
  },
  {
    from: 'Vulnerability Mapper',
    to: 'Alert Commander',
    type: 'data',
    content: 'VULNERABILITY DATA: Pinellas Point (96/100), St. Pete Beach (96/100), Clearwater Beach (93/100), Davis Islands (87/100). Transmitting full dataset...',
    status: 'sent'
  },
  {
    from: 'Resource Coordinator',
    to: 'Alert Commander',
    type: 'data',
    content: 'RESOURCE MAP: Shelter capacity 30K available. Evacuation routes open. Medical surge capacity confirmed. Transmitting allocation matrix...',
    status: 'sent'
  },
  {
    from: 'Alert Commander',
    to: 'System',
    type: 'alert',
    content: 'SELF-CORRECTION LOOP: Reviewing action plan... Detected conflict: Zone 3 shelter assignment exceeds capacity. Re-routing 2,400 residents to USF Sun Dome. Plan revised.',
    status: 'processing'
  },
  {
    from: 'Alert Commander',
    to: 'All Zones',
    type: 'alert',
    content: 'MANDATORY EVACUATION ORDER: Zones A/AE/VE — Pinellas Point, Davis Islands, St. Pete Beach, Clearwater Beach. Depart NOW via I-75N or I-4E. Shelters open.',
    status: 'sent'
  }
];

export const ALERTS: Alert[] = [
  {
    id: 'alert-1',
    timestamp: new Date(Date.now() - 3600000),
    priority: 'critical',
    zone: 'Pinellas Point',
    message: 'MANDATORY EVACUATION — Zone A. Storm surge 10-14ft expected. All residents must evacuate immediately.',
    agentSource: 'Alert Commander',
    actionRequired: 'Evacuate via Gulf Blvd N to I-275 N',
    population: 8420
  },
  {
    id: 'alert-2',
    timestamp: new Date(Date.now() - 3200000),
    priority: 'critical',
    zone: 'St. Pete Beach',
    message: 'MANDATORY EVACUATION — Zone VE. Direct wave action threat. 9,800 residents must evacuate.',
    agentSource: 'Alert Commander',
    actionRequired: 'Evacuate via Corey Ave to I-275 N',
    population: 9800
  },
  {
    id: 'alert-3',
    timestamp: new Date(Date.now() - 2800000),
    priority: 'critical',
    zone: 'Clearwater Beach',
    message: 'MANDATORY EVACUATION — Zone VE. 44% elderly population flagged for assisted transport.',
    agentSource: 'Alert Commander',
    actionRequired: 'Special needs transport: Call 727-464-3800',
    population: 11200
  },
  {
    id: 'alert-4',
    timestamp: new Date(Date.now() - 2400000),
    priority: 'warning',
    zone: 'Davis Islands',
    message: 'EVACUATION ORDER — Zone AE. Isolated island community. Bridge closure imminent in 6 hours.',
    agentSource: 'Alert Commander',
    actionRequired: 'Cross Davis Islands Bridge immediately',
    population: 5100
  },
  {
    id: 'alert-5',
    timestamp: new Date(Date.now() - 1800000),
    priority: 'warning',
    zone: 'Gandy Bridge Area',
    message: 'EVACUATION WARNING — Zone AE. 35% low-income population. Free bus service activated at 5 locations.',
    agentSource: 'Alert Commander',
    actionRequired: 'Free evacuation buses: Gandy Blvd & Dale Mabry',
    population: 12300
  },
  {
    id: 'alert-6',
    timestamp: new Date(Date.now() - 1200000),
    priority: 'advisory',
    zone: 'Ybor City',
    message: 'SHELTER IN PLACE ADVISORY — Zone X. Monitor conditions. Prepare go-bag. Nearest shelter: Yuengling Center.',
    agentSource: 'Alert Commander',
    actionRequired: 'Prepare emergency kit, monitor updates',
    population: 18700
  },
  {
    id: 'alert-7',
    timestamp: new Date(Date.now() - 600000),
    priority: 'info',
    zone: 'All Zones',
    message: 'SHELTER UPDATE: USF Sun Dome (2,340/8,000), Yuengling Center (5,800/10,000), Tropicana Field (9,100/12,000). All accepting evacuees.',
    agentSource: 'Resource Coordinator',
    actionRequired: 'Proceed to nearest available shelter',
    population: 0
  }
];
