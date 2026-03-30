import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import CalendarGrid from '../components/CalendarGrid';
import './Calendar.css';

export default function Calendar() {
  const { user } = useAuth();
  const [year, setYear] = useState(new Date().getFullYear());
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    if (!user) return;
    fetchDiaryPosts();
  }, [user, year]);

  async function fetchDiaryPosts() {
    // Fetch posts that have a date_tag  OR have a tag named "diary"
    const { data } = await supabase
      .from('posts')
      .select('id, title, subtitle, date_tag, post_tags(tags(name))')
      .eq('user_id', user.id)
      .not('date_tag', 'is', null)
      .gte('date_tag', `${year}-01-01`)
      .lte('date_tag', `${year}-12-31`)
      .order('date_tag');

    setPosts(data || []);
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  return (
    <div className="calendar-page">
      <div className="calendar-header">
        <h1>Calendar</h1>
        <div className="calendar-year-picker">
          <select value={year} onChange={e => setYear(parseInt(e.target.value))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>
      <CalendarGrid year={year} posts={posts} />
    </div>
  );
}
