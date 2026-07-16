"use client";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, Circle } from "react-leaflet";

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as L.Icon.Default & { _getIconUrl?: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom green marker icon
const createGreenIcon = () => {
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        background-color: #22c55e;
        width: 25px;
        height: 25px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid #ffffff;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
      ">
        <div style="
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(45deg);
          width: 8px;
          height: 8px;
          background-color: #ffffff;
          border-radius: 50%;
        "></div>
      </div>
    `,
    iconSize: [25, 25],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24],
  });
};

export default function ServiceAreaMapInner() {
  const serviceLocations = [
    {
      name: "Orange County",
      state: "California",
      lat: 33.7175,
      lng: -117.8311,
      description: "Primary service area covering all of Orange County",
    },
    {
      name: "Las Vegas",
      state: "Nevada",
      lat: 36.1699,
      lng: -115.1398,
      description:
        "Secondary service area covering Las Vegas metropolitan area",
    },
  ];

  // Center the map between the two locations
  const mapCenter: [number, number] = [34.8, -116.5];

  useEffect(() => {
    // Fix for map container sizing issues
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="w-full h-64 rounded-lg overflow-hidden">
      <MapContainer
        center={mapCenter}
        zoom={6}
        style={{ height: "100%", width: "100%" }}
        className="rounded-lg"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {serviceLocations.map((location, index) => (
          <div key={index}>
            {/* 50-mile radius circle */}
            <Circle
              center={[location.lat, location.lng]}
              radius={80467} // 50 miles in meters (50 * 1609.34)
              pathOptions={{
                color: "#16a34a",
                weight: 2.5,
                opacity: 0.6,
                fillColor: "#6ee44f",
                fillOpacity: 0.15,
              }}
            />

            {/* Marker */}
            <Marker
              position={[location.lat, location.lng]}
              icon={createGreenIcon()}
            >
              <Popup>
                <div className="text-center p-2">
                  <h3 className="font-semibold text-sm mb-1">
                    {location.name}, {location.state}
                  </h3>
                  <p className="text-xs text-gray-600">
                    {location.description}
                  </p>
                  <p className="text-xs text-primary font-medium mt-2">
                    50-mile service radius
                  </p>
                </div>
              </Popup>
            </Marker>
          </div>
        ))}
      </MapContainer>
    </div>
  );
}
