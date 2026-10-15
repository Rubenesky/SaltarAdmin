import React, { useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import type { DateClickArg } from '@fullcalendar/interaction'
import esLocale from '@fullcalendar/core/locales/es'
import type { DatesSetArg, DayCellContentArg } from '@fullcalendar/core'
import { getReservasEnRango } from '../lib/supabase'
import DayReservationsModal from './DayReservationsModal'
import { getErrorMessage } from '../lib/errors'
import type { ReservaConArticulo } from '../types'

const toDateStr = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const MonthCalendarView: React.FC = () => {
  const [reservas, setReservas] = useState<ReservaConArticulo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string | null>(null)

  const handleDatesSet = (info: DatesSetArg) => {
    const fetchData = async () => {
      try {
        const data = await getReservasEnRango(info.startStr, info.endStr)
        setReservas(data)
        setError('')
      } catch (err) {
        setError(getErrorMessage(err, 'No se pudieron cargar las reservas.'))
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }

  const handleDateClick = (info: DateClickArg) => {
    setFechaSeleccionada(info.dateStr)
  }

  const reservasDelDia = fechaSeleccionada
    ? reservas.filter(
        (r) => r.estado !== 'cancelada' && r.fecha_inicio <= fechaSeleccionada && fechaSeleccionada < r.fecha_fin
      )
    : []

  const tieneReservaEnDia = (fecha: string): boolean =>
    reservas.some((r) => r.estado !== 'cancelada' && r.fecha_inicio <= fecha && fecha < r.fecha_fin)

  const handleDayCellClassNames = (arg: DayCellContentArg): string[] =>
    tieneReservaEnDia(toDateStr(arg.date)) ? ['fc-day-has-reserva'] : ['fc-day-libre']

  if (loading) return <div className="p-4 text-center text-gray-600">Cargando calendario...</div>

  return (
    <div className="bg-white p-4 rounded-none border border-gray-200 relative">
      {error && (
        <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-none p-2">{error}</p>
      )}

      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        locale={esLocale}
        headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }}
        height="auto"
        dateClick={handleDateClick}
        dayCellClassNames={handleDayCellClassNames}
        datesSet={handleDatesSet}
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
