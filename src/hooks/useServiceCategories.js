import { useEffect, useState } from 'react';
import { categoriesApi, getAuthData, hotelApi } from '../lib/api';

/**
 * Load active service categories from the API (public or seller).
 * Falls back to empty list on error so callers can render gracefully.
 */
export default function useServiceCategories({ seller = false } = {}) {
  const [categories, setCategories] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const token = getAuthData()?.token;
        const response = seller && token
          ? await hotelApi.getServiceCategories(token).catch(() => categoriesApi.list())
          : await categoriesApi.list();
        if (!active) return;
        setCategories(response.categories || []);
        setGroups(response.groups || groupCategories(response.categories || []));
      } catch (requestError) {
        if (!active) return;
        setError(requestError.message || 'Failed to load categories');
        setCategories([]);
        setGroups([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [seller]);

  return { categories, groups, loading, error };
}

export function groupCategories(categories = []) {
  const map = new Map();
  categories.forEach((category) => {
    const group = category.group || 'Other';
    if (!map.has(group)) map.set(group, []);
    map.get(group).push(category);
  });
  return [...map.entries()].map(([group, items]) => ({ group, categories: items }));
}
