import React, { useEffect, useMemo, useRef, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import resourceTimelinePlugin from '@fullcalendar/resource-timeline'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg } from '@fullcalendar/core'
import esLocale from '@fullcalendar/core/locales/es'
import { getArticulosDisponibles, getBloqueos, getReservasEnRango } from '../lib/supabase'
import { formatFecha } from '../lib/format'
import type { Articulo, Bloqueo, ReservaConArticulo } from '../types'
import { CATEGORIAS } from '../lib/categorias'

const toDateStr = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

interface CalendarProps {
  onCeldaClick: (articuloId: string, articuloNombre: string, start: string, end: string) => void
  onArticuloClick: (articulo: Articulo) => void
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
  const calendarRef = useRef<FullCalendar>(null)

  const onArticuloClickRef = useRef(onArticuloClick)
  useEffect(() => {
    onArticuloClickRef.current = onArticuloClick
  }, [onArticuloClick])

  const articulosRef = useRef(articulos)
  useEffect(() => {
    articulosRef.current = articulos
  }, [articulos])

  useEffect(() => {
    const applyResponsiveView = () => {
      const api = calendarRef.current?.getApi()
      if (!api) return
      const isMobile = window.innerWidth < 768
      const targetView = isMobile ? 'resourceTimelineWeek' : 'resourceTimelineMonth'
      if (api.view.type !== targetView) {
        api.changeView(targetView)
      }
    }
    applyResponsiveView()
    window.addEventListener('resize', applyResponsiveView)
    return () => window.removeEventListener('resize', applyResponsiveView)
  }, [])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const hoy = new Date()
        const desde = new Date(hoy.getFullYear(), hoy.getMonth() - 3, hoy.getDate())
        const hasta = new Date(hoy.getFullYear(), hoy.getMonth() + 6, hoy.getDate())
        const [a, r, b] = await Promise.all([
          getArticulosDisponibles(),
          getReservasEnRango(toDateStr(desde), toDateStr(hasta)),
          getBloqueos(),
        ])
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

  const resources = useMemo(() => {
    // Comparación normalizada (NFC + trim) en vez de indexOf directo: dos
    // fuentes independientes del mismo texto con tilde -- este código y lo
    // que se tecleó en el editor SQL de Supabase -- pueden diferir en la
    // forma de codificar el acento (NFC vs NFD) aunque se vean idénticas,
    // haciendo fallar una comparación estricta de string.
    const normalizar = (s: string) => s.normalize('NFC').trim().toLowerCase()
    const categoriasNormalizadas = CATEGORIAS.map(normalizar)

    return articulos
      .map((a) => {
        const ordenCategoria = categoriasNormalizadas.indexOf(normalizar(a.categoria))
        return {
          id: a.id,
          title: a.nombre,
          categoria: a.categoria,
          ordenCategoria: ordenCategoria === -1 ? CATEGORIAS.length : ordenCategoria,
        }
      })
      // resourceGroupField no admite un orden de grupo propio: cada grupo
      // aparece en el orden en que se encuentra su primer artículo, que seguía
      // el orden alfabético por nombre de la query. Pre-ordenar aquí por
      // categoría es lo que realmente fija el orden de los grupos.
      .sort((a, b) => a.ordenCategoria - b.ordenCategoria || a.title.localeCompare(b.title, 'es'))
  }, [articulos])

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
      const popoverWidth = 256
      const x = Math.max(8, Math.min(info.jsEvent.pageX + 8, window.innerWidth - popoverWidth - 8))
      const y = Math.max(8, Math.min(info.jsEvent.pageY + 8, window.innerHeight - 8))
      setPopover({ x, y, reserva })
    }
  }

  if (loading) return <div className="p-4 text-center text-gray-600">Cargando calendario...</div>
  if (articulos.length === 0) return <div className="p-4 text-center text-gray-500">No hay artículos disponibles.</div>

  return (
    <div className="bg-white p-4 rounded-none border border-gray-200 relative">
      <FullCalendar
        ref={calendarRef}
        plugins={[resourceTimelinePlugin, interactionPlugin]}
        initialView="resourceTimelineMonth"
        resources={resources}
        events={events}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: '',
        }}
        resourceAreaWidth="200px"
        resourceAreaHeaderContent="Artículos"
        resourceGroupField="ordenCategoria"
        resourceGroupLabelContent={(renderProps) => CATEGORIAS[renderProps.groupValue as number] ?? 'Otras'}
        resourceOrder="title"
        resourceGroupLabelClassNames={() => [
          'font-heading',
          'font-bold',
          'uppercase',
          'tracking-wide',
          'text-sm',
        ]}
        height="auto"
        locale={esLocale}
        slotDuration={{ days: 1 }}
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
          info.el.setAttribute('role', 'button')
          info.el.setAttribute('tabindex', '0')
          const clickArticulo = () => {
            const articulo = articulosRef.current.find((a) => a.id === info.resource.id)
            if (articulo) onArticuloClickRef.current(articulo)
          }
          info.el.addEventListener('click', clickArticulo)
          info.el.addEventListener('keydown', (e) => {
            const event = e as KeyboardEvent
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              clickArticulo()
            }
          })
        }}
      />

      {popover && (
        <>
          <button
            type="button"
            aria-label="Cerrar detalles de la reserva"
            className="fixed inset-0 z-40 cursor-default bg-transparent border-0 p-0"
            onClick={() => setPopover(null)}
          />
          <div
            className="fixed z-50 bg-white border border-gray-200 rounded-none shadow-xl p-4 w-64"
            style={{ top: popover.y, left: popover.x }}
          >
            <button
              onClick={() => setPopover(null)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
              aria-label="Cerrar"
            >
              ✕
            </button>
            <h3 className="font-heading font-bold text-gray-900 mb-2">{popover.reserva.cliente_nombre}</h3>
            <p className="text-sm text-gray-600">📞 {popover.reserva.cliente_telefono}</p>
            {popover.reserva.cliente_email && (
              <p className="text-sm text-gray-600">✉️ {popover.reserva.cliente_email}</p>
            )}
            <p className="text-sm text-gray-600">
              📅 {formatFecha(popover.reserva.fecha_inicio)} → {formatFecha(popover.reserva.fecha_fin)}
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
