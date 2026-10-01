export type StudioShareKind = 'image' | 'video'

export type StudioShareStatus = 1 | 2

export type StudioShareParam = string | number

/** Artwork snapshot stored with a submission. */
export type StudioShareArtwork = {
  kind: StudioShareKind
  status: 'done'
  url: string
  coverUrl?: string
  width: number
  height: number
  prompt: string
  model: string
  provider?: string
  schemaId?: string
  params: Record<string, StudioShareParam>
  values: Record<string, string>
  refImages?: string[]
  createdAt: number
}

/** One work of the studio gallery: a submission or a Midjourney work. */
export type StudioShareItem = {
  id: number
  source: 'share' | 'midjourney'
  kind: StudioShareKind
  status: StudioShareStatus
  data: StudioShareArtwork
  created_at: number
  published_at: number
  /** True when the signed in visitor submitted the work. */
  owner: boolean
}

export type StudioSharePage = {
  items: StudioShareItem[]
  next_cursor: string
}
