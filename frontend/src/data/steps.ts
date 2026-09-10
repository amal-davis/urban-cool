import type { ComponentType, SVGProps } from 'react'
import { CalendarIcon, CheckCircleIcon, GridIcon, HomeIcon } from '../components/icons/Icons'

export interface Step {
  id: string
  number: number
  title: string
  description: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
}

export const steps: Step[] = [
  {
    id: 'choose',
    number: 1,
    title: 'Choose a Service',
    description: 'Select the appliance that needs service.',
    Icon: GridIcon,
  },
  {
    id: 'book',
    number: 2,
    title: 'Book a Service',
    description: 'Submit your service request.',
    Icon: CalendarIcon,
  },
  {
    id: 'visit',
    number: 3,
    title: 'Technician Visit',
    description: 'A technician visits your location.',
    Icon: HomeIcon,
  },
  {
    id: 'serviced',
    number: 4,
    title: 'Get It Serviced',
    description: 'Get your appliance checked and serviced.',
    Icon: CheckCircleIcon,
  },
]
