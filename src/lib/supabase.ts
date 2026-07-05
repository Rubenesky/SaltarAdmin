import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

export async function getArticles() {
  const { data, error } = await supabase.from('articles').select('*');
  if (error) throw new Error(error.message);
  return data;
}

export async function getReservations() {
  const { data, error } = await supabase.from('reservations').select('*');
  if (error) throw new Error(error.message);
  return data;
}

export async function createReservation(data: any) {
  const { data, error } = await supabase.from('reservations').insert([data]);
  if (error) throw new Error(error.message);
  return data;
}

export async function createArticle(data: any) {
  const { data, error } = await supabase.from('articles').insert([data]);
  if (error) throw new Error(error.message);
  return data;
}
