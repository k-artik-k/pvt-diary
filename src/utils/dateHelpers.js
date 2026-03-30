const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTH_ABBR = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

// Parse date from diary format: "1st January 2025", "2nd Feb 2025", "23rd March 2025"
export function parseDiaryDate(title) {
  if (!title) return null;
  const regex = /(\d{1,2})(st|nd|rd|th)\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i;
  const match = title.match(regex);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const monthStr = match[3];
  let monthIndex = MONTHS.findIndex(m => m.toLowerCase() === monthStr.toLowerCase());
  if (monthIndex === -1) {
    monthIndex = MONTH_ABBR.findIndex(m => m.toLowerCase() === monthStr.toLowerCase());
  }
  if (monthIndex === -1) return null;

  const year = parseInt(match[4], 10);
  return new Date(year, monthIndex, day);
}

export function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function getRelativeTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

export { MONTHS, MONTH_ABBR };
