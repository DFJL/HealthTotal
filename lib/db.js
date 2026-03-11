// lib/db.js
// Data access layer — all Supabase queries go here.
// Each function takes userId so AppInner never touches supabase directly.
import { supabase } from './supabase';

// ─── PROFILE ──────────────────────────────────────────────────
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();
  if (error) throw error;
  return data; // null if not found
}

export async function upsertProfile(userId, patch) {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({ id: userId, ...patch, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── FOOD LOG ─────────────────────────────────────────────────
// Returns object keyed by date string: { "2026-03-05": [...entries] }
export async function getFoodLog(userId, days = 365) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceStr = since.toISOString().slice(0, 10);

  const { data, error } = await supabase
    .from('food_log')
    .select('*')
    .eq('user_id', userId)
    .gte('log_date', sinceStr)
    .order('log_date', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) throw error;

  // Group by date
  const grouped = {};
  for (const row of data) {
    const d = row.log_date;
    if (!grouped[d]) grouped[d] = [];
    grouped[d].push(dbRowToEntry(row));
  }
  return grouped;
}

export async function upsertFoodEntry(userId, dateStr, entry) {
  const { error } = await supabase
    .from('food_log')
    .upsert({
      id:           entry.id,
      user_id:      userId,
      log_date:     dateStr,
      name:         entry.name,
      calories:     entry.calories   || 0,
      protein:      entry.protein    || 0,
      carbs:        entry.carbs      || 0,
      fats:         entry.fats       || 0,
      grade:        entry.grade      || null,
      score:        entry.score      || null,
      meal:         entry.meal       || null,
      day_type:     entry.dayType    || null,
      ldl_impact:   entry.ldl_impact || null,
      hba1c_impact: entry.hba1c_impact || null,
      notes:        entry.notes      || null,
      alerta:       entry.alerta     || null,
      image_thumb:  entry.image      || null,
    });
  if (error) throw error;
}

export async function deleteFoodEntry(entryId) {
  const { error } = await supabase
    .from('food_log')
    .delete()
    .eq('id', entryId);
  if (error) throw error;
}

// Map snake_case DB row → camelCase entry
function dbRowToEntry(row) {
  return {
    id:           row.id,
    name:         row.name,
    calories:     row.calories,
    protein:      Number(row.protein),
    carbs:        Number(row.carbs),
    fats:         Number(row.fats),
    grade:        row.grade,
    score:        row.score,
    meal:         row.meal,
    dayType:      row.day_type,
    ldl_impact:   row.ldl_impact,
    hba1c_impact: row.hba1c_impact,
    notes:        row.notes,
    alerta:       row.alerta,
    image:        row.image_thumb,
  };
}

// ─── FAVORITES ────────────────────────────────────────────────
export async function getFavorites(userId) {
  const { data, error } = await supabase
    .from('favorites')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data.map(r => ({
    id: r.id, name: r.name,
    calories: r.calories, protein: Number(r.protein),
    carbs: Number(r.carbs), fats: Number(r.fats),
    grade: r.grade, score: r.score,
    meal: r.meal, dayType: r.day_type,
    ldl_impact: r.ldl_impact, hba1c_impact: r.hba1c_impact,
    notes: r.notes,
  }));
}

export async function upsertFavorite(userId, fav) {
  const { error } = await supabase
    .from('favorites')
    .upsert({
      id: fav.id, user_id: userId,
      name: fav.name, calories: fav.calories,
      protein: fav.protein, carbs: fav.carbs, fats: fav.fats,
      grade: fav.grade, score: fav.score,
      meal: fav.meal, day_type: fav.dayType,
      ldl_impact: fav.ldl_impact, hba1c_impact: fav.hba1c_impact,
      notes: fav.notes,
    });
  if (error) throw error;
}

export async function deleteFavorite(favId) {
  const { error } = await supabase
    .from('favorites')
    .delete()
    .eq('id', favId);
  if (error) throw error;
}

// ─── BODY MEASUREMENTS ────────────────────────────────────────
export async function getBodyMeasurements(userId) {
  const { data, error } = await supabase
    .from('body_measurements')
    .select('*')
    .eq('user_id', userId)
    .order('measured_at', { ascending: true });
  if (error) throw error;
  return data.map(r => ({
    id: r.id, d: r.measured_at,
    w: Number(r.weight), m: Number(r.muscle),
    f: Number(r.fat_pct), s: r.inbody_score,
    vi: r.visceral_fat, whr: Number(r.whr),
    note: r.note, isSeed: r.is_seed,
  }));
}

export async function insertBodyMeasurement(userId, row) {
  const { error } = await supabase
    .from('body_measurements')
    .insert({
      user_id: userId,
      measured_at: row.d, weight: row.w,
      muscle: row.m, fat_pct: row.f,
      inbody_score: row.s, visceral_fat: row.vi,
      whr: row.whr, note: row.note,
    });
  if (error) throw error;
}

// ─── LAB RESULTS ──────────────────────────────────────────────
export async function getLabResults(userId) {
  const { data, error } = await supabase
    .from('lab_results')
    .select('*')
    .eq('user_id', userId)
    .order('tested_at', { ascending: true });
  if (error) throw error;
  return data;
}

export async function insertLabResult(userId, lab) {
  const { error } = await supabase
    .from('lab_results')
    .insert({
      user_id: userId,
      tested_at: lab.date,
      panel_name: lab.panel,
      markers: lab.markers,
      notes: lab.notes,
    });
  if (error) throw error;
}

// ─── AI CACHE ─────────────────────────────────────────────────
export async function getAiCache(userId, cacheKey) {
  const { data, error } = await supabase
    .from('ai_cache')
    .select('data, generated_at')
    .eq('user_id', userId)
    .eq('cache_key', cacheKey)
    .single();
  if (error) return null; // not found
  return { data: data.data, ts: new Date(data.generated_at).getTime() };
}

export async function setAiCache(userId, cacheKey, value) {
  const { error } = await supabase
    .from('ai_cache')
    .upsert({
      user_id: userId,
      cache_key: cacheKey,
      data: value,
      generated_at: new Date().toISOString(),
    });
  if (error) throw error;
}

// ─── BODY PHOTOS ──────────────────────────────────────────────
export async function getBodyPhotos(userId) {
  const { data, error } = await supabase
    .from('body_photos')
    .select('*')
    .eq('user_id', userId)
    .order('photo_date', { ascending: true });
  if (error) throw error;
  return data.map(r => ({
    id: r.id, date: r.photo_date,
    note: r.note, image: r.thumb_b64,
  }));
}

export async function insertBodyPhoto(userId, photo) {
  const { error } = await supabase
    .from('body_photos')
    .insert({
      user_id: userId,
      photo_date: photo.date,
      note: photo.note,
      thumb_b64: photo.image,
    });
  if (error) throw error;
}

export async function deleteBodyPhoto(photoId) {
  const { error } = await supabase
    .from('body_photos')
    .delete()
    .eq('id', photoId);
  if (error) throw error;
}