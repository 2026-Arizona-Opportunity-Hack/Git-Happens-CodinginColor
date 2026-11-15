import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Imports store phones however each source wrote them. Show US 10-digit
// numbers (with or without a leading 1) one way; leave anything else as is.
export function fmtPhone(phone: string): string {
  const d = phone.replace(/\D/g, '')
  const ten = d.length === 11 && d[0] === '1' ? d.slice(1) : d
  if (ten.length !== 10 || /[a-z]/i.test(phone)) return phone
  return `(${ten.slice(0, 3)}) ${ten.slice(3, 6)}-${ten.slice(6)}`
}
