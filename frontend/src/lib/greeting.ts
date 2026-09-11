/** "Good Morning"/"Good Afternoon"/"Good Evening" by local time — shared by
 *  TechnicianHeader (desktop + the mobile header row it still renders) and
 *  MobileGreetingBanner (the mobile-only home's own banner), so the two
 *  never drift into disagreeing about what time of day it is. */
export function timeOfDayGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 17) return 'Good Afternoon'
  return 'Good Evening'
}
