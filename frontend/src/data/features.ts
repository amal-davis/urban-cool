import type { ComponentType, SVGProps } from 'react'
import {
  GridIcon,
  HeadsetIcon,
  ClockIcon,
  HomeIcon,
  ShieldCheckIcon,
  TechnicianIcon,
} from '../components/icons/Icons'

export interface Feature {
  id: string
  title: string
  description: string
  Icon: ComponentType<SVGProps<SVGSVGElement>>
}

export const features: Feature[] = [
  {
    id: 'skilled-technicians',
    title: 'Skilled Technicians',
    description: 'Get professional appliance service from skilled technicians.',
    Icon: TechnicianIcon,
  },
  {
    id: 'doorstep-service',
    title: 'Doorstep Service',
    description: 'Convenient appliance service at your doorstep.',
    Icon: HomeIcon,
  },
  {
    id: 'quick-response',
    title: 'Quick Response',
    description: 'Book your service easily and get a prompt response.',
    Icon: ClockIcon,
  },
  {
    id: 'transparent-service',
    title: 'Transparent Service',
    description: 'Clear service communication with no unnecessary complexity.',
    Icon: ShieldCheckIcon,
  },
  {
    id: 'multiple-appliances',
    title: 'Multiple Appliance Services',
    description: 'One place for AC, refrigerator, washing machine and microwave services.',
    Icon: GridIcon,
  },
  {
    id: 'customer-focused',
    title: 'Customer Focused',
    description: 'Service designed around customer convenience and satisfaction.',
    Icon: HeadsetIcon,
  },
]
