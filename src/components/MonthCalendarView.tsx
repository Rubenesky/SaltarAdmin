import React, { useEffect, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { DateClickArg } from '@fullcalendar/interaction'
import esLocale from '@fullcalendar/core/locales/es'
import { getReservas } from '../lib/supabase'
import DayReservationsModal from './DayReservationsModal'
import type { ReservaConArticulo } from '../types'

const MonthCalendarView: React.FC = () => {
  const [reservas, setReservas] = useState<ReservaConArticulo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getReservas()
        setReservas(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudieron cargar las reservas.')
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleDateClick = (info: DateClickArg) => {
    setFechaSeleccionada(info.dateStr)
  }

  const reservasDelDia = fechaSeleccionada
    ? reservas.filter(
        (r) => r.estado !== 'cancelada' && r.fecha_inicio <= fechaSeleccionada && fechaSeleccionada < r.fecha_fin
      )
    : []

  if (loading) return <div className="p-4 text-center text-gray-600">Cargando calendario...</div>

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg relative">
      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">{error}</p>
      )}

      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={esLocale}
        headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
        height="auto"
        dateClick={handleDateClick}
      />

      {fechaSeleccionada && (
        <DayReservationsModal
          isOpen={!!fechaSeleccionada}
          onClose={() => setFechaSeleccionada(null)}
          fecha={fechaSeleccionada}
          reservas={reservasDelDia}
        />
      )}
    </div>
  )
}

export default MonthCalendarView
