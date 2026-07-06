import React, { useEffect, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import resourceTimelinePlugin from '@fullcalendar/resource-timeline'
import interactionPlugin from '@fullcalendar/interaction'
import { supabase } from '../lib/supabase'

// Ocultar mensajes de licencia
const originalWarn = console.warn
console.warn = (...args) => {
  if (typeof args[0] === 'string' && args[0].includes('license key')) {
    return
  }
  originalWarn(...args)
}

interface Articulo {
  id: string
  nombre: string
  categoria: string
  estado: string
}

interface Reserva {
  id: string
  articulo_id: string
  cliente_nombre: string
  fecha_inicio: string
  fecha_fin: string
}

const Calendar: React.FC = () => {
  const [articulos, setArticulos] = useState<Articulo[]>([])
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: articulosData } = await supabase.from('articulos').select('*')
        setArticulos(articulosData || [])

        const { data: reservasData } = await supabase.from('reservas').select('*')
        setReservas(reservasData || [])
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const events = reservas.map((reserva) => ({
    id: reserva.id,
    title: `📌 ${reserva.cliente_nombre}`,
    start: reserva.fecha_inicio,
    end: reserva.fecha_fin,
    resourceId: reserva.articulo_id,
    backgroundColor: '#ef4444',
    borderColor: '#dc2626'
  }))

  const resources = articulos.map((articulo) => ({
    id: articulo.id,
    title: `${articulo.nombre} (${articulo.categoria})`
  }))

  if (loading) {
    return <div className="p-4 text-center text-gray-600">Cargando calendario...</div>
  }

  if (articulos.length === 0) {
    return <div className="p-4 text-center text-gray-500">No hay artículos para mostrar.</div>
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow">
      <FullCalendar
        plugins={[dayGridPlugin, resourceTimelinePlugin, interactionPlugin]}
        initialView="resourceTimelineDay"
        resources={resources}
        events={events}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'resourceTimelineDay,resourceTimelineWeek'
        }}
        resourceAreaWidth="200px"
        height="auto"
        selectable={true}
        select={(info) => {
          const articuloNombre = info.resource?.title || 'Sin seleccionar'
          alert(`📅 Nueva reserva\nArtículo: ${articuloNombre}\nDesde: ${info.startStr}\nHasta: ${info.endStr}`)
        }}
        eventClick={(info) => {
          alert(`📌 Reserva: ${info.event.title}\nFecha: ${info.event.startStr}`)
        }}
      />
    </div>
  )
}

export default Calendar