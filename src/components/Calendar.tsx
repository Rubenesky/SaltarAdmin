import React, { useEffect, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useSupabase } from '../lib/supabase';

interface CalendarProps {
  onCeldaClick: (articuloId: number, start: string, end: string) => void;
}

const Calendar: React.FC<CalendarProps> = ({ onCeldaClick }) => {
  const { supabase } = useSupabase();
  const [events, setEvents] = useState([]);

  useEffect(() => {
    async function fetchArticulos() {
      try {
        const { data, error } = await supabase
          .from('articulos')
          .select('*');
        if (!error) {
          setEvents(data.map(articulo => ({
            title: articulo.nombre,
            start: '2023-10-01T09:00:00',
            end: '2023-10-01T17:00:00',
            resourceId: articulo.id
          })));
        }
      } catch (error) {
        console.error('Error fetching articles:', error);
      }
    }

    fetchArticulos();
  }, [supabase]);

  useEffect(() => {
    async function fetchReservas() {
      try {
        const { data, error } = await supabase
          .from('reservas')
          .select('*');
        if (!error) {
          setEvents(prevEvents => prevEvents.map(event => ({
            ...event,
            title: `${event.title} - ${data.find(reserva => reserva.articulo_id === event.resourceId)?.estado}`
          })));
        }
      } catch (error) {
        console.error('Error fetching reservations:', error);
      }
    }

    fetchReservas();
  }, [supabase]);

  const handleDateClick = (info: any) => {
    onCeldaClick(info.event.extendedProps.resourceId, info.startStr, info.endStr);
  };

  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
      initialView="timeGridWeek"
      events={events}
      dateClick={handleDateClick}
      eventContent={(info) => {
        const reserva = info.event.extendedProps;
        return (
          <div>
            {reserva.title}
            {reserva.estado && (
              <span className={`ml-2 px-2 py-1 rounded ${reserva.estado === 'pendiente' ? 'bg-yellow-100' : 
                reserva.estado === 'confirmada' ? 'bg-green-100' : 
                reserva.estado === 'cancelada' ? 'bg-red-100' : 
                reserva.estado === 'completada' ? 'bg-blue-100' : ''}`}>
                {reserva.estado}
              </span>
            )}
          </div>
        );
      }}
    />
  );
};

export default Calendar;
