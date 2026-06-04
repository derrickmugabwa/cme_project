'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/client'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export const OTHER_ORGANISATION_VALUE = 'other'

export type OrganisationOption = {
  id: string
  name: string
  status?: string
}

interface OrganisationSelectProps {
  value: string
  onValueChange: (value: string) => void
  otherValue?: string
  onOtherValueChange?: (value: string) => void
  label?: string
  placeholder?: string
  includeOther?: boolean
  showStatus?: boolean
  activeOnly?: boolean
  required?: boolean
  error?: string
}

export function OrganisationSelect({
  value,
  onValueChange,
  otherValue = '',
  onOtherValueChange,
  label = 'Institution of Work',
  placeholder = 'Select an organisation',
  includeOther = true,
  showStatus = false,
  activeOnly = false,
  required = false,
  error,
}: OrganisationSelectProps) {
  const [organisations, setOrganisations] = useState<OrganisationOption[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchOrganisations = async () => {
      const supabase = createClient()
      let query = supabase
        .from('organisations')
        .select('id, name, status')
        .order('name', { ascending: true })

      query = activeOnly ? query.eq('status', 'active') : query.neq('status', 'disabled')

      const { data, error } = await query

      if (error) {
        console.error('Error fetching organisations:', error)
        setOrganisations([])
      } else {
        setOrganisations(data || [])
      }

      setIsLoading(false)
    }

    fetchOrganisations()
  }, [activeOnly])

  return (
    <div className="grid gap-2">
      <Label htmlFor="organisation">{label}</Label>
      <Select value={value} onValueChange={onValueChange} required={required}>
        <SelectTrigger id="organisation" className={error ? 'border-red-300' : ''}>
          <SelectValue placeholder={isLoading ? 'Loading organisations...' : placeholder} />
        </SelectTrigger>
        <SelectContent>
          {organisations.map((organisation) => (
            <SelectItem key={organisation.id} value={organisation.id}>
              {organisation.name}
              {showStatus && organisation.status && organisation.status !== 'active'
                ? ` (${organisation.status})`
                : ''}
            </SelectItem>
          ))}
          {includeOther && <SelectItem value={OTHER_ORGANISATION_VALUE}>Other</SelectItem>}
        </SelectContent>
      </Select>
      {value === OTHER_ORGANISATION_VALUE && (
        <Input
          id="organisation-other"
          value={otherValue}
          onChange={(event) => onOtherValueChange?.(event.target.value)}
          placeholder="Enter your organisation"
          required={required}
          className={error ? 'border-red-300' : ''}
        />
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
