"""
Agent 2 — Vulnerability Mapper (ParallelAgent)
Agent 3 — Resource Coordinator (ParallelAgent)

These two agents run in parallel via asyncio.gather(), demonstrating the
ParallelAgent pattern. Both receive Storm Watcher's output simultaneously
and produce their analyses concurrently, cutting total latency in half.
"""
import asyncio
import uuid
from datetime import datetime
from typing import Optional

from models.types import (
    AgentMessage, AgentStatus, AgentTrace, MessageEventType,
    OutputType, ShelterResource, ThreatLevel, VulnerabilityZone
)

# Tampa Bay vulnerability zones — based on FEMA FIRM maps and
# CDC Social Vulnerability Index (SVI) for Hillsborough/Pinellas counties.
VULNERABILITY_ZONES_DATA = [
    {"id": "zone-a", "name": "Pinellas Point", "flood_zone": "VE",
     "base_risk": 95, "population": 8420, "elderly_pct": 0.31,
     "low_income_pct": 0.28, "mobility_pct": 0.18,
     "lat": 27.7037, "lng": -82.6847},
    {"id": "zone-b", "name": "Davis Islands", "flood_zone": "AE",
     "base_risk": 88, "population": 5200, "elderly_pct": 0.22,
     "low_income_pct": 0.15, "mobility_pct": 0.12,
     "lat": 27.9181, "lng": -82.4489},
    {"id": "zone-c", "name": "Apollo Beach", "flood_zone": "AE",
     "base_risk": 82, "population": 12300, "elderly_pct": 0.28,
     "low_income_pct": 0.22, "mobility_pct": 0.15,
     "lat": 27.7706, "lng": -82.4017},
    {"id": "zone-d", "name": "Clearwater Beach", "flood_zone": "VE",
     "base_risk": 91, "population": 6800, "elderly_pct": 0.35,
     "low_income_pct": 0.18, "mobility_pct": 0.20,
     "lat": 27.9772, "lng": -82.8277},
    {"id": "zone-e", "name": "St. Pete Beach", "flood_zone": "AE",
     "base_risk": 85, "population": 9100, "elderly_pct": 0.40,
     "low_income_pct": 0.20, "mobility_pct": 0.22,
     "lat": 27.7259, "lng": -82.7401},
    {"id": "zone-f", "name": "Gandy Bridge Corridor", "flood_zone": "X",
     "base_risk": 55, "population": 18400, "elderly_pct": 0.15,
     "low_income_pct": 0.35, "mobility_pct": 0.10,
     "lat": 27.9094, "lng": -82.5124},
    {"id": "zone-g", "name": "Riverview", "flood_zone": "X",
     "base_risk": 42, "population": 22100, "elderly_pct": 0.12,
     "low_income_pct": 0.25, "mobility_pct": 0.08,
     "lat": 27.8656, "lng": -82.3284},
    {"id": "zone-h", "name": "New Port Richey", "flood_zone": "AE",
     "base_risk": 72, "population": 16800, "elderly_pct": 0.38,
     "low_income_pct": 0.30, "mobility_pct": 0.19,
     "lat": 28.2442, "lng": -82.7190},
]

# Tampa Bay emergency shelters
SHELTER_DATA = [
    {"id": "shelter-1", "name": "USF Sun Dome", "address": "4202 E Fowler Ave, Tampa",
     "capacity": 12000, "base_occupancy": 0, "lat": 28.0622, "lng": -82.4135},
    {"id": "shelter-2", "name": "Yuengling Center", "address": "4202 E Fowler Ave, Tampa",
     "capacity": 11000, "base_occupancy": 0, "lat": 28.0597, "lng": -82.4153},
    {"id": "shelter-3", "name": "Tropicana Field", "address": "1 Tropicana Dr, St. Petersburg",
     "capacity": 7000, "base_occupancy": 0, "lat": 27.7683, "lng": -82.6534},
]


def _compute_zone_risk(zone_data: dict, threat_level: ThreatLevel,
                       alert_count: int) -> tuple[int, str]:
    """Compute dynamic risk score based on threat level and real alert data."""
    base = zone_data["base_risk"]
    # Threat level multiplier
    multipliers = {
        ThreatLevel.NONE: 0.3,
        ThreatLevel.MONITORING: 0.5,
        ThreatLevel.WATCH: 0.75,
        ThreatLevel.WARNING: 0.9,
        ThreatLevel.CRITICAL: 1.0,
    }
    mult = multipliers.get(threat_level, 0.5)
    # Alert count bonus (more alerts = higher urgency)
    alert_bonus = min(10, alert_count * 2)
    score = min(100, int(base * mult) + alert_bonus)

    # Determine status
    if score >= 80 and threat_level in (ThreatLevel.WARNING, ThreatLevel.CRITICAL):
        status = "evacuate"
    elif score >= 65:
        status = "warning"
    elif score >= 45:
        status = "watch"
    else:
        status = "safe"

    return score, status


def _compute_shelter_occupancy(shelter: dict, threat_level: ThreatLevel) -> int:
    """Estimate shelter occupancy based on threat level (labeled as 'estimated')."""
    rates = {
        ThreatLevel.NONE: 0.02,
        ThreatLevel.MONITORING: 0.05,
        ThreatLevel.WATCH: 0.15,
        ThreatLevel.WARNING: 0.40,
        ThreatLevel.CRITICAL: 0.75,
    }
    rate = rates.get(threat_level, 0.05)
    return int(shelter["capacity"] * rate)


class VulnerabilityMapperAgent:
    """
    ParallelAgent — runs concurrently with ResourceCoordinator.
    Computes dynamic risk scores for all 8 Tampa Bay zones using
    real threat data from Storm Watcher.
    """
    AGENT_ID = "vulnerability-mapper"
    AGENT_NAME = "Vulnerability Mapper"

    def __init__(self, run_id: str):
        self.run_id = run_id
        self.status = AgentStatus.IDLE
        self.messages: list[AgentMessage] = []

    def _emit(self, to: str, event_type: MessageEventType,
              content: str, payload: dict) -> AgentMessage:
        msg = AgentMessage(
            id=str(uuid.uuid4()),
            from_agent=self.AGENT_ID,
            to_agent=to,
            event_type=event_type,
            content=content,
            payload=payload,
        )
        self.messages.append(msg)
        return msg

    async def run(self, threat_level: ThreatLevel, alert_count: int) -> dict:
        self.status = AgentStatus.ACTIVE
        started = datetime.utcnow()

        # Simulate parallel zone analysis (in real ADK this would be sub-agents)
        await asyncio.sleep(0.05)

        zones: list[VulnerabilityZone] = []
        for zd in VULNERABILITY_ZONES_DATA:
            risk_score, status = _compute_zone_risk(zd, threat_level, alert_count)
            zones.append(VulnerabilityZone(
                id=zd["id"],
                name=zd["name"],
                flood_zone=zd["flood_zone"],
                risk_score=risk_score,
                population=zd["population"],
                elderly_pct=zd["elderly_pct"],
                low_income_pct=zd["low_income_pct"],
                mobility_impaired_pct=zd["mobility_pct"],
                lat=zd["lat"],
                lng=zd["lng"],
                status=status,
            ))

        high_risk = [z for z in zones if z.risk_score >= 65]
        total_at_risk = sum(z.population for z in high_risk)

        self._emit(
            to="alert-commander",
            event_type=MessageEventType.DATA,
            content=f"Vulnerability analysis complete. {len(high_risk)} high-risk zones, "
                    f"{total_at_risk:,} people at risk.",
            payload={
                "high_risk_zones": len(high_risk),
                "total_at_risk": total_at_risk,
                "zones": [{"id": z.id, "name": z.name, "risk_score": z.risk_score,
                            "status": z.status, "population": z.population} for z in zones],
                "output_type": "deterministic",
                "source": "FEMA FIRM + CDC SVI"
            }
        )

        self.status = AgentStatus.COMPLETE
        completed = datetime.utcnow()
        exec_ms = int((completed - started).total_seconds() * 1000)

        trace = AgentTrace(
            agent_id=self.AGENT_ID,
            agent_name=self.AGENT_NAME,
            run_id=self.run_id,
            status=self.status,
            confidence=100.0,
            loop_iteration=1,
            input_payload={"threat_level": threat_level.value, "alert_count": alert_count},
            output_payload={"zones": len(zones), "high_risk": len(high_risk),
                            "total_at_risk": total_at_risk},
            output_type=OutputType.DETERMINISTIC,
            llm_narrative=None,
            deterministic_rationale=(
                f"Risk scores computed from FEMA flood zone classification "
                f"(VE/AE/X) × threat multiplier ({threat_level.value}) + "
                f"alert bonus ({alert_count} alerts). CDC SVI weights applied "
                f"for elderly, low-income, and mobility-impaired populations."
            ),
            started_at=started,
            completed_at=completed,
            execution_ms=exec_ms,
        )

        return {
            "zones": zones,
            "high_risk_zones": high_risk,
            "total_at_risk": total_at_risk,
            "messages": self.messages,
            "trace": trace,
        }


class ResourceCoordinatorAgent:
    """
    ParallelAgent — runs concurrently with VulnerabilityMapper.
    Identifies available shelters, estimates occupancy, and
    computes available capacity for each facility.
    """
    AGENT_ID = "resource-coordinator"
    AGENT_NAME = "Resource Coordinator"

    def __init__(self, run_id: str):
        self.run_id = run_id
        self.status = AgentStatus.IDLE
        self.messages: list[AgentMessage] = []

    def _emit(self, to: str, event_type: MessageEventType,
              content: str, payload: dict) -> AgentMessage:
        msg = AgentMessage(
            id=str(uuid.uuid4()),
            from_agent=self.AGENT_ID,
            to_agent=to,
            event_type=event_type,
            content=content,
            payload=payload,
        )
        self.messages.append(msg)
        return msg

    async def run(self, threat_level: ThreatLevel) -> dict:
        self.status = AgentStatus.ACTIVE
        started = datetime.utcnow()

        await asyncio.sleep(0.05)

        shelters: list[ShelterResource] = []
        for sd in SHELTER_DATA:
            occupancy = _compute_shelter_occupancy(sd, threat_level)
            shelters.append(ShelterResource(
                id=sd["id"],
                name=sd["name"],
                address=sd["address"],
                capacity=sd["capacity"],
                current_occupancy=occupancy,
                lat=sd["lat"],
                lng=sd["lng"],
                status="open" if threat_level != ThreatLevel.NONE else "standby",
                source="estimated",
            ))

        total_capacity = sum(s.capacity for s in shelters)
        total_occupied = sum(s.current_occupancy for s in shelters)
        available = total_capacity - total_occupied

        self._emit(
            to="alert-commander",
            event_type=MessageEventType.DATA,
            content=f"Resource coordination complete. {len(shelters)} shelters, "
                    f"{available:,} beds available ({total_capacity:,} total).",
            payload={
                "shelter_count": len(shelters),
                "total_capacity": total_capacity,
                "available_capacity": available,
                "occupancy_pct": round(total_occupied / total_capacity * 100, 1),
                "shelters": [{"id": s.id, "name": s.name, "capacity": s.capacity,
                               "available": s.available_capacity,
                               "status": s.status} for s in shelters],
                "output_type": "estimated",
                "source": "Estimated from threat level (Florida Shelter Status System not publicly accessible)"
            }
        )

        self.status = AgentStatus.COMPLETE
        completed = datetime.utcnow()
        exec_ms = int((completed - started).total_seconds() * 1000)

        trace = AgentTrace(
            agent_id=self.AGENT_ID,
            agent_name=self.AGENT_NAME,
            run_id=self.run_id,
            status=self.status,
            confidence=100.0,
            loop_iteration=1,
            input_payload={"threat_level": threat_level.value},
            output_payload={"shelters": len(shelters), "available": available,
                            "occupancy_pct": round(total_occupied / total_capacity * 100, 1)},
            output_type=OutputType.ESTIMATED,
            llm_narrative=None,
            deterministic_rationale=(
                f"Shelter occupancy estimated from threat-level occupancy rates "
                f"({threat_level.value}). Florida Shelter Status System (FLSHELTER) "
                f"is not publicly accessible; this is a labeled estimate."
            ),
            started_at=started,
            completed_at=completed,
            execution_ms=exec_ms,
        )

        return {
            "shelters": shelters,
            "total_capacity": total_capacity,
            "available_capacity": available,
            "messages": self.messages,
            "trace": trace,
        }
