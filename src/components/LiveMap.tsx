import { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, Circle, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface StudentMarkerData {
  id: string
  name: string
  roll_number: string
  latitude?: number
  longitude?: number
  status: 'inside' | 'outside' | 'offline'
  ip_address?: string
  last_seen?: string
  distance?: number
}

interface LiveMapProps {
  classroomLat: number
  classroomLng: number
  radius: number
  students: StudentMarkerData[]
  isSelectingLocation?: boolean
  onLocationSelected?: (lat: number, lng: number) => void
  theme?: 'dark' | 'light'
}

// Custom DivIcons utilizing Tailwind classes for premium aesthetic
const createClassroomIcon = () => {
  return L.divIcon({
    html: `<div class="relative w-8 h-8 flex items-center justify-center bg-violet-650 rounded-full border border-violet-400 shadow-lg shadow-violet-500/40">
             <div class="w-3.5 h-3.5 bg-white rounded-full animate-pulse"></div>
           </div>`,
    className: 'custom-classroom-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  })
}

const createStudentIcon = (status: 'inside' | 'outside' | 'offline') => {
  const colorClass = status === 'inside'
    ? 'bg-emerald-500 shadow-emerald-500/50 border-emerald-400'
    : status === 'outside'
      ? 'bg-rose-500 shadow-rose-500/50 border-rose-400'
      : 'bg-amber-500 shadow-amber-500/50 border-amber-400'

  const pulseRing = status !== 'offline'
    ? `<div class="absolute inset-0 rounded-full animate-ping opacity-60 ${
        status === 'inside' ? 'bg-emerald-500' : 'bg-rose-500'
      }"></div>`
    : ''

  return L.divIcon({
    html: `<div class="relative w-6 h-6 flex items-center justify-center">
             ${pulseRing}
             <div class="relative w-3.5 h-3.5 rounded-full border border-white shadow-md ${colorClass}"></div>
           </div>`,
    className: 'custom-student-icon',
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  })
}

// Subcomponent to trigger flyTo animation when classroom coordinates change
function RecenterMap({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap()
  useEffect(() => {
    map.flyTo([lat, lng], 17, { duration: 1.5 })
  }, [lat, lng, map])
  return null
}

// Subcomponent to handle map clicks for selecting classroom coordinates
function MapEventsHandler({
  isSelecting,
  onSelected
}: {
  isSelecting: boolean
  onSelected?: (lat: number, lng: number) => void
}) {
  useMapEvents({
    click(e) {
      if (isSelecting && onSelected) {
        onSelected(e.latlng.lat, e.latlng.lng)
      }
    }
  })
  return null
}

export default function LiveMap({
  classroomLat,
  classroomLng,
  radius,
  students,
  isSelectingLocation = false,
  onLocationSelected,
  theme
}: LiveMapProps) {
  const [isClient, setIsClient] = useState(false)
  const [mapTheme, setMapTheme] = useState<'dark' | 'light'>('dark')

  // Ensure Leaflet is only initiated on the browser client
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (theme) {
      setMapTheme(theme)
    } else {
      const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
      setMapTheme(isDark ? 'dark' : 'light')
    }
  }, [theme])

  if (!isClient) {
    return (
      <div className="w-full h-full bg-ct-bg flex items-center justify-center text-ct-muted border border-ct-border rounded-2xl">
        Loading interactive classroom map...
      </div>
    )
  }

  const classroomPosition: [number, number] = [classroomLat, classroomLng]
  const tileUrl = mapTheme === 'dark'
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"

  return (
    <div className="w-full h-full relative overflow-hidden rounded-2xl border border-ct-border shadow-inner">
      <MapContainer
        center={classroomPosition}
        zoom={17}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        style={{ background: mapTheme === 'dark' ? '#09090b' : '#f8fafc' }}
      >
        <TileLayer
          key={mapTheme}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={tileUrl}
        />

        <MapEventsHandler isSelecting={isSelectingLocation} onSelected={onLocationSelected} />
        
        <RecenterMap lat={classroomLat} lng={classroomLng} />

        <Marker position={classroomPosition} icon={createClassroomIcon()}>
          <Popup className="custom-popup">
            <div className="p-1 font-sans text-xs text-ct-text border-0 leading-relaxed">
              <p className="font-bold text-violet-500">Classroom Location</p>
              <p className="text-[10px] text-ct-muted mt-0.5">Boundary radius: {radius}m</p>
            </div>
          </Popup>
        </Marker>

        <Circle
          center={classroomPosition}
          radius={radius}
          pathOptions={{
            color: '#7c3aed', // violet-600
            fillColor: '#7c3aed',
            fillOpacity: 0.1,
            weight: 1.5,
            dashArray: '4, 6'
          }}
        />

        {students.map((student) => {
          if (student.latitude === undefined || student.longitude === undefined) return null
          const studentPos: [number, number] = [student.latitude, student.longitude]
          return (
            <Marker
              key={student.id}
              position={studentPos}
              icon={createStudentIcon(student.status)}
            >
              <Tooltip permanent direction="top" className="custom-tooltip" offset={[0, -10]}>
                {student.name}
              </Tooltip>
              <Popup>
                <div className="p-1 font-sans text-xs text-ct-text border-0 leading-relaxed min-w-[150px]">
                  <p className="font-bold text-ct-text text-sm border-b border-ct-border pb-1 mb-1">{student.name}</p>
                  <p className="text-[10px] text-ct-muted">Roll: {student.roll_number}</p>
                  <p className="text-[10px] text-ct-muted">IP: {student.ip_address || 'N/A'}</p>
                  <p className="text-[10px] text-ct-muted">
                    Distance: <span className="font-medium text-ct-text">{student.distance !== undefined ? `${student.distance}m` : 'N/A'}</span>
                  </p>
                  <p className="text-[10px] text-ct-muted">
                    Last Seen: <span className="font-medium text-ct-text">{student.last_seen ? new Date(student.last_seen).toLocaleTimeString() : 'N/A'}</span>
                  </p>
                  <p className="text-[10px] mt-1.5 flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${
                      student.status === 'inside' ? 'bg-emerald-500' : student.status === 'outside' ? 'bg-rose-500' : 'bg-amber-500'
                    }`} />
                    <span
                      className={`font-semibold capitalize ${
                        student.status === 'inside'
                          ? 'text-emerald-500'
                          : student.status === 'outside'
                          ? 'text-rose-500'
                          : 'text-amber-500'
                      }`}
                    >
                      {student.status === 'inside' ? 'Inside Radius' : student.status === 'outside' ? 'Outside Radius' : 'Offline'}
                    </span>
                  </p>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {isSelectingLocation && (
        <div className="absolute top-4 right-4 bg-ct-card-solid/95 border border-ct-border text-ct-text text-xs px-3 py-2 rounded-xl backdrop-blur-md shadow-lg pointer-events-none z-[1000] flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-violet-500 animate-ping"></div>
          Click on the map to set the classroom location.
        </div>
      )}
    </div>
  )
}
