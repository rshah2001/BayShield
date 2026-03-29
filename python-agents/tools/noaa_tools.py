"""NOAA/NWS data fetching tools for BayShield ADK agents."""
import asyncio
import json
import re
import xml.etree.ElementTree as ET
from datetime import datetime
from typing import Optional
import httpx

from models.types import (
    ActiveStorm, NWSAlert, ThreatLevel, WeatherObservation
)

# Tampa Bay coordinates
TAMPA_BAY_LAT = 27.9506
TAMPA_BAY_LNG = -82.4572
TAMPA_BAY_COUNTIES = ["Hillsborough", "Pinellas", "Manatee", "Pasco", "Hernando"]

NWS_HEADERS = {
    "User-Agent": "BayShield-ADK/3.0 (disaster-response@bayshield.ai)",
    "Accept": "application/geo+json"
}


async def fetch_ktpa_observations() -> Optional[WeatherObservation]:
    """Fetch live weather observations from Tampa International Airport (KTPA)."""
    url = "https://api.weather.gov/stations/KTPA/observations/latest"
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(url, headers=NWS_HEADERS)
            resp.raise_for_status()
            data = resp.json()
            props = data.get("properties", {})

            temp_c = props.get("temperature", {}).get("value")
            wind_ms = props.get("windSpeed", {}).get("value") or 0.0
            wind_dir_deg = props.get("windDirection", {}).get("value") or 0
            pressure_pa = props.get("barometricPressure", {}).get("value") or 101325
            description = props.get("textDescription", "Unknown")
            timestamp_str = props.get("timestamp", datetime.utcnow().isoformat())

            # Convert wind direction degrees to compass
            directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
                          "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"]
            wind_dir = directions[int((wind_dir_deg + 11.25) / 22.5) % 16] if wind_dir_deg else "N"

            return WeatherObservation(
                station="KTPA",
                temperature_c=round(temp_c, 1) if temp_c is not None else 22.0,
                wind_speed_ms=round(wind_ms, 1),
                wind_direction=wind_dir,
                pressure_pa=pressure_pa,
                description=description,
                timestamp=datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
                if isinstance(timestamp_str, str) else datetime.utcnow()
            )
        except Exception as e:
            print(f"[KTPA] Fetch error: {e}")
            return None


async def fetch_nws_alerts() -> list[NWSAlert]:
    """Fetch active NWS alerts for Tampa Bay counties."""
    url = "https://api.weather.gov/alerts/active?area=FL&status=actual&message_type=alert"
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(url, headers=NWS_HEADERS)
            resp.raise_for_status()
            data = resp.json()
            alerts = []
            for feature in data.get("features", []):
                props = feature.get("properties", {})
                area_desc = props.get("areaDesc", "")
                # Filter to Tampa Bay counties only
                if any(county in area_desc for county in TAMPA_BAY_COUNTIES):
                    alerts.append(NWSAlert(
                        id=props.get("id", ""),
                        event=props.get("event", "Unknown"),
                        severity=props.get("severity", "Unknown"),
                        area_desc=area_desc,
                        headline=props.get("headline", ""),
                        expires=props.get("expires")
                    ))
            return alerts
        except Exception as e:
            print(f"[NWS Alerts] Fetch error: {e}")
            return []


async def fetch_nhc_active_storms() -> list[ActiveStorm]:
    """Fetch active Atlantic storms from NHC RSS feed."""
    url = "https://www.nhc.noaa.gov/nhc_at1.xml"
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            resp = await client.get(url, timeout=10.0)
            resp.raise_for_status()
            root = ET.fromstring(resp.text)
            ns = {"geo": "http://www.w3.org/2003/01/geo/wgs84_pos#"}
            storms = []
            for item in root.findall(".//item"):
                title = item.findtext("title", "")
                # Only active tropical systems
                if any(kw in title for kw in ["Hurricane", "Tropical Storm", "Tropical Depression"]):
                    lat_el = item.find("geo:lat", ns)
                    lng_el = item.find("geo:long", ns)
                    lat = float(lat_el.text) if lat_el is not None else 0.0
                    lng = float(lng_el.text) if lng_el is not None else 0.0
                    desc = item.findtext("description", "")

                    # Parse wind speed from description
                    wind_match = re.search(r"(\d+)\s*(?:kt|knots)", desc, re.IGNORECASE)
                    wind_kt = float(wind_match.group(1)) if wind_match else 0.0

                    # Compute distance from Tampa Bay using Haversine
                    import math
                    R = 3958.8  # miles
                    lat1, lng1 = math.radians(TAMPA_BAY_LAT), math.radians(TAMPA_BAY_LNG)
                    lat2, lng2 = math.radians(lat), math.radians(lng)
                    dlat, dlng = lat2 - lat1, lng2 - lng1
                    a = math.sin(dlat/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(dlng/2)**2
                    distance = R * 2 * math.asin(math.sqrt(a))

                    # Determine category from wind speed
                    if wind_kt >= 137:
                        cat = 5
                    elif wind_kt >= 113:
                        cat = 4
                    elif wind_kt >= 96:
                        cat = 3
                    elif wind_kt >= 83:
                        cat = 2
                    elif wind_kt >= 64:
                        cat = 1
                    else:
                        cat = 0

                    storms.append(ActiveStorm(
                        name=title.split("Advisory")[0].strip(),
                        category=cat,
                        wind_kt=wind_kt,
                        distance_miles=round(distance, 1),
                        bearing="NNW",
                        movement_mph=14.0,
                        lat=lat,
                        lng=lng
                    ))
            return storms
        except Exception as e:
            print(f"[NHC] Fetch error: {e}")
            return []


def compute_threat_level(
    observation: Optional[WeatherObservation],
    alerts: list[NWSAlert],
    storms: list[ActiveStorm]
) -> ThreatLevel:
    """Compute threat level from real NOAA data — fully deterministic."""
    # Active nearby storm — highest priority
    for storm in storms:
        if storm.distance_miles < 200:
            return ThreatLevel.CRITICAL
        if storm.distance_miles < 400:
            return ThreatLevel.WARNING

    # NWS alert severity
    for alert in alerts:
        sev = alert.severity.lower()
        if sev == "extreme":
            return ThreatLevel.CRITICAL
        if sev == "severe":
            return ThreatLevel.WARNING
        if sev == "moderate":
            return ThreatLevel.WATCH

    # Wind speed thresholds from KTPA
    if observation:
        wind_kt = observation.wind_speed_ms * 1.94384
        if wind_kt >= 64:
            return ThreatLevel.WARNING
        if wind_kt >= 34:
            return ThreatLevel.WATCH
        if wind_kt >= 20:
            return ThreatLevel.MONITORING

    return ThreatLevel.MONITORING if alerts else ThreatLevel.NONE
