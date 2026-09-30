/**
 * "Today" for Fairway's business (India). The Postgres container runs in UTC, so CURRENT_DATE is
 * yesterday between 00:00 and 05:30 IST — follow-up due dates and won dates must use this instead.
 */
export const BUSINESS_TZ = 'Asia/Kolkata';
export const BUSINESS_TODAY_SQL = `(now() AT TIME ZONE '${BUSINESS_TZ}')::date`;
