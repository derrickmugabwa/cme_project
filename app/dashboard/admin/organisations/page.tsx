'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Building2, Plus, Search } from 'lucide-react'
import toast from 'react-hot-toast'

type OrganisationStatus = 'active' | 'pending' | 'disabled'

type Organisation = {
  id: string
  name: string
  status: OrganisationStatus
  created_at: string
}

export default function OrganisationManagementPage() {
  const router = useRouter()
  const supabase = createClient()
  const [organisations, setOrganisations] = useState<Organisation[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  const fetchOrganisations = async () => {
    setLoading(true)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/dashboard')
      return
    }

    const { data: currentUser } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (currentUser?.role !== 'admin') {
      router.push('/dashboard')
      return
    }

    const { data, error } = await supabase
      .from('organisations')
      .select('id, name, status, created_at')
      .order('status', { ascending: false })
      .order('name', { ascending: true })

    if (error) {
      toast.error(error.message)
      setOrganisations([])
    } else {
      setOrganisations(data || [])
    }

    setLoading(false)
  }

  useEffect(() => {
    void Promise.resolve().then(() => fetchOrganisations())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredOrganisations = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return organisations

    return organisations.filter((organisation) =>
      organisation.name.toLowerCase().includes(query) ||
      organisation.status.toLowerCase().includes(query)
    )
  }, [organisations, searchQuery])

  const addOrganisation = async (event: React.FormEvent) => {
    event.preventDefault()

    const name = newName.trim()
    if (!name) {
      toast.error('Organisation name is required')
      return
    }

    const { error } = await supabase
      .from('organisations')
      .insert({ name, status: 'active' })

    if (error) {
      toast.error(error.message)
      return
    }

    setNewName('')
    toast.success('Organisation added')
    fetchOrganisations()
  }

  const updateOrganisation = async (
    organisation: Organisation,
    updates: Partial<Pick<Organisation, 'name' | 'status'>>
  ) => {
    const nextName = updates.name?.trim()
    if (updates.name !== undefined && !nextName) {
      toast.error('Organisation name is required')
      return
    }

    setSavingId(organisation.id)

    const { error } = await supabase
      .from('organisations')
      .update({
        ...updates,
        ...(nextName ? { name: nextName } : {}),
      })
      .eq('id', organisation.id)

    setSavingId(null)

    if (error) {
      toast.error(error.message)
      return
    }

    setOrganisations((current) =>
      current.map((item) =>
        item.id === organisation.id
          ? { ...item, ...updates, ...(nextName ? { name: nextName } : {}) }
          : item
      )
    )
    toast.success('Organisation updated')
  }

  const statusBadge = (status: OrganisationStatus) => {
    if (status === 'active') return 'bg-green-100 text-green-800 hover:bg-green-200'
    if (status === 'pending') return 'bg-amber-100 text-amber-800 hover:bg-amber-200'
    return 'bg-gray-100 text-gray-800 hover:bg-gray-200'
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Organisations</h1>
          <p className="text-sm text-muted-foreground">
            Manage signup organisations and approve new entries.
          </p>
        </div>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Add Organisation</CardTitle>
          <CardDescription>Create an active organisation for signup and content restrictions.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={addOrganisation} className="flex flex-col gap-3 md:flex-row md:items-end">
            <div className="grid flex-1 gap-2">
              <Label htmlFor="organisation-name">Name</Label>
              <Input
                id="organisation-name"
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="e.g. Kenyatta National Hospital"
              />
            </div>
            <Button type="submit" className="bg-[#008C45] text-white hover:bg-[#006633]">
              <Plus className="mr-2 h-4 w-4" />
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle>Organisation List</CardTitle>
              <CardDescription>Pending entries are created when users choose Other during signup.</CardDescription>
            </div>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search organisations..."
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          ) : filteredOrganisations.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              <Building2 className="mx-auto mb-3 h-10 w-10 opacity-50" />
              No organisations found
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrganisations.map((organisation) => (
                    <TableRow key={organisation.id}>
                      <TableCell className="min-w-64">
                        <Input
                          defaultValue={organisation.name}
                          onBlur={(event) => {
                            if (event.target.value.trim() !== organisation.name) {
                              updateOrganisation(organisation, { name: event.target.value })
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Badge className={statusBadge(organisation.status)}>
                            {organisation.status}
                          </Badge>
                          <Select
                            value={organisation.status}
                            onValueChange={(value) =>
                              updateOrganisation(organisation, { status: value as OrganisationStatus })
                            }
                            disabled={savingId === organisation.id}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="disabled">Disabled</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(organisation.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        {organisation.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => updateOrganisation(organisation, { status: 'active' })}
                            disabled={savingId === organisation.id}
                            className="bg-[#008C45] text-white hover:bg-[#006633]"
                          >
                            Approve
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
