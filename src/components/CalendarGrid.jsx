import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getDaysInMonth, getFirstDayOfMonth, MONTH_ABBR } from '../utils/dateHelpers';
import './CalendarGrid.css';

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export default function CalendarGrid({ year, posts = [] }) {
  const navigate = useNavigate();
  const [hoveredDay, setHoveredDay] = useState(null);

  // Build a map of date -> post info for quick lookup
  const postMap = useMemo(() => {
    const map = {};
    posts.forEach(post => {
      if (post.date_tag) {
        const d = new Date(post.date_tag);
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        map[key] = { subtitle: post.subtitle || post.title, id: post.id };
      }
    });
    return map;
  }, [posts]);

  const today = new Date();

  return (
    <div className="calendar-grid">
      {Array.from({ length: 12 }, (_, month) => {
        const days = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);

        return (
          <div key={month} className="calendar-month">
            <div className="calendar-month-title">{MONTH_ABBR[month]}</div>
            <div className="calendar-weekdays">
              {WEEKDAYS.map(d => <span key={d}>{d}</span>)}
            </div>
            <div className="calendar-days">
              {/* Empty cells before first day */}
              {Array.from({ length: firstDay }, (_, i) => (
                <span key={`e-${i}`} className="calendar-day" />
              ))}
              {/* Day cells */}
              {Array.from({ length: days }, (_, i) => {
                const day = i + 1;
                const key = `${year}-${month}-${day}`;
                const post = postMap[key];
                const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
                const hoverKey = `${month}-${day}`;

                return (
                  <span
                    key={day}
                    className={`calendar-day ${post ? 'has-post' : ''} ${isToday && !post ? 'today' : ''}`}
                    onMouseEnter={() => post && setHoveredDay(hoverKey)}
                    onMouseLeave={() => setHoveredDay(null)}
                    onClick={() => post && navigate(`/post/${post.id}`)}
                    style={{ position: 'relative' }}
                  >
                    {day}
                    {hoveredDay === hoverKey && post && (
                      <span className="calendar-tooltip">{post.subtitle}</span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
