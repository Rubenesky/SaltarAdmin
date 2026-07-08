import React, { useEffect, useMemo, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import resourceTimelinePlugin from '@fullcalendar/resource-timeline'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg } from '@fullcalendar/core'
import esLocale from '@fullcalendar/core/locales/es'
import { getArticulosDisponibles, getBloqueos, getReservas } from '../lib/supabase'
import type { Articulo, Bloqueo, ReservaConArticulo } from '../types'

interface CalendarProps {
  onCeldaClick: (articuloId: string, articuloNombre: string, start: string, end: string) => void
  onArticuloClick: (articuloId: string) => void
}

interface ReservaPopoverState {
  x: number
  y: number
  reserva: ReservaConArticulo
}

const Calendar: React.FC<CalendarProps> = ({ onCeldaClick, onArticuloClick }) => {
  const [articulos, setArticulos] = useState<Articulo[]>([])
  const [reservas, setReservas] = useState<ReservaConArticulo[]>([])
  const [bloqueos, setBloqueos] = useState<Bloqueo[]>([])
  const [loading, setLoading] = useState(true)
  const [popover, setPopover] = useState<ReservaPopoverState | null>(null)

  const onArticuloClickRef = useRef(onArticuloClick)
  useEffect(() => {
    onArticuloClickRef.current = onArticuloClick
  }, [onArticuloClick])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [a, r, b] = await Promise.all([getArticulosDisponibles(), getReservas(), getBloqueos()])
        setArticulos(a)
        setReservas(r)
        setBloqueos(b)
      } catch (error) {
        console.error('Error cargando el calendario:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const resources = useMemo(() => articulos.map((a) => ({ id: a.id, title: a.nombre })), [articulos])

  const reservaEvents = useMemo(
    () =>
      reservas
        .filter((r) => r.estado !== 'cancelada')
        .map((r) => ({
          id: `reserva-${r.id}`,
          resourceId: r.articulo_id,
          title: r.cliente_nombre,
          start: r.fecha_inicio,
          end: r.fecha_fin,
          backgroundColor: '#dc2626',
          borderColor: '#dc2626',
          extendedProps: { type: 'reserva' as const, reserva: r },
        })),
    [reservas]
  )

  const bloqueoEvents = useMemo(
    () =>
      bloqueos.map((b) => ({
        id: `bloqueo-${b.id}`,
        resourceId: b.articulo_id,
        title: b.motivo || 'Bloqueado',
        start: b.fecha_inicio,
        end: b.fecha_fin,
        backgroundColor: '#9ca3af',
        borderColor: '#9ca3af',
        extendedProps: { type: 'bloqueo' as const },
      })),
    [bloqueos]
  )

  const events = useMemo(() => [...reservaEvents, ...bloqueoEvents], [reservaEvents, bloqueoEvents])

  const handleEventClick = (info: EventClickArg) => {
    if (info.event.extendedProps.type === 'reserva') {
      const reserva = info.event.extendedProps.reserva as ReservaConArticulo
      setPopover({ x: info.jsEvent.pageX, y: info.jsEvent.pageY, reserva })
    }
  }

  if (loading) return <div className="p-4 text-center text-gray-600">Cargando calendario...</div>
  if (articulos.length === 0) return <div className="p-4 text-center text-gray-500">No hay artículos disponibles.</div>

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg relative">
      <FullCalendar
        plugins={[resourceTimelinePlugin, interactionPlugin]}
        initialView="resourceTimelineMonth"
        resources={resources}
        events={events}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'resourceTimelineMonth',
        }}
        resourceAreaWidth="200px"
        resourceAreaHeaderContent="Artículos"
        height="auto"
        locale={esLocale}
        slotLabelFormat={{ day: 'numeric' }}
        schedulerLicenseKey="CC-Attribution-NonCommercial-NoDerivatives"
        resourceLaneClassNames={() => ['fc-available-lane']}
        selectable
        selectOverlap={false}
        select={(info) => {
          if (info.resource?.id) {
            onCeldaClick(info.resource.id, info.resource.title, info.startStr, info.endStr)
          }
        }}
        eventClick={handleEventClick}
        resourceLabelDidMount={(info) => {
          info.el.style.cursor = 'pointer'
          info.el.addEventListener('click', () => onArticuloClickRef.current(info.resource.id))
        }}
      />

      {popover && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setPopover(null)} />
          <div
            className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-4 w-64"
            style={{ top: popover.y + 8, left: popover.x + 8 }}
          >
            <button
              onClick={() => setPopover(null)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              aria-label="Cerrar"
            >
              ✕
            </button>
            <h3 className="font-bold text-gray-800 mb-2">{popover.reserva.cliente_nombre}</h3>
            <p className="text-sm text-gray-600">📞 {popover.reserva.cliente_telefono}</p>
            {popover.reserva.cliente_email && (
              <p className="text-sm text-gray-600">✉️ {popover.reserva.cliente_email}</p>
            )}
            <p className="text-sm text-gray-600">
              📅 {popover.reserva.fecha_inicio} → {popover.reserva.fecha_fin}
            </p>
            <p className="text-sm text-gray-600 capitalize">Estado: {popover.reserva.estado}</p>
            {popover.reserva.notas && (
              <p className="text-sm text-gray-600 mt-2 border-t pt-2">📝 {popover.reserva.notas}</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default Calendar
