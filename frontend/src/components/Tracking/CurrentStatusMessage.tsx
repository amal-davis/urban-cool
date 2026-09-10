import { bookingStatusMessages } from '../../lib/bookingApi'
import type { BookingStatus } from '../../lib/bookingApi'

interface CurrentStatusMessageProps {
  status: Exclude<BookingStatus, 'cancelled'>
}

/** One line of plain-language status copy below StatusTimeline — pulled
 *  from bookingStatusMessages (lib/bookingApi.ts), never hardcoded per
 *  status here. */
export function CurrentStatusMessage({ status }: CurrentStatusMessageProps) {
  return (
    <p className="status-timeline__message" role="status">
      {bookingStatusMessages[status]}
    </p>
  )
}
