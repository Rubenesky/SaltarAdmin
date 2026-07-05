import { useEffect, useState } from 'react';
import { getArticles, getReservations, createReservation, createArticle } from './lib/supabase';

export function useSupabase() {
  const [articles, setArticles] = useState([]);
  const [reservations, setReservations] = useState([]);

  useEffect(() => {
    async function fetchArticles() {
      try {
        const data = await getArticles();
        setArticles(data);
      } catch (error) {
        console.error('Error fetching articles:', error);
      }
    }

    async function fetchReservations() {
      try {
        const data = await getReservations();
        setReservations(data);
      } catch (error) {
        console.error('Error fetching reservations:', error);
      }
    }

    fetchArticles();
    fetchReservations();
  }, []);

  return { articles, reservations };
}
