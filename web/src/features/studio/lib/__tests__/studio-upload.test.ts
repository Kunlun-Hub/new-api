import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn() },
}))
vi.mock('../video-cover', () => ({ extractVideoCover: vi.fn() }))

type StudioUploadModule = typeof import('../studio-upload')
type ApiMock = {
  get: ReturnType<typeof vi.fn>
  post: ReturnType<typeof vi.fn>
}

let apiMock: ApiMock
let studioUpload: StudioUploadModule
let extractVideoCoverMock: ReturnType<typeof vi.fn>

beforeEach(async () => {
  vi.resetModules()
  apiMock = (await import('@/lib/api')).api as unknown as ApiMock
  extractVideoCoverMock = (await import('../video-cover'))
    .extractVideoCover as unknown as ReturnType<typeof vi.fn>
  extractVideoCoverMock.mockReset()
  extractVideoCoverMock.mockResolvedValue(null)
  apiMock.get.mockReset()
  apiMock.post.mockReset()
  apiMock.get.mockResolvedValue({
    data: { data: { configured: false, public_base_url: '' } },
  })
  studioUpload = await import('../studio-upload')
})

describe('persistStudioMedia', () => {
  it('keeps media that the gateway already stores', async () => {
    await expect(
      studioUpload.persistStudioMedia(
        '/api/studio/oss/file/studio_image/a.jpg',
        'studio_image'
      )
    ).resolves.toBe('/api/studio/oss/file/studio_image/a.jpg')
    expect(apiMock.post).not.toHaveBeenCalled()
  })

  it('keeps gateway media reached through an absolute origin', async () => {
    const stored = `${window.location.origin}/api/studio/oss/file/studio_image/a.jpg`

    await expect(
      studioUpload.persistStudioMedia(stored, 'studio_image')
    ).resolves.toBe(stored)
    expect(apiMock.get).not.toHaveBeenCalled()
    expect(apiMock.post).not.toHaveBeenCalled()
  })

  it('keeps media that already lives in the personal bucket', async () => {
    apiMock.get.mockResolvedValue({
      data: {
        data: {
          configured: true,
          public_base_url: 'https://cdn.example.com/me',
        },
      },
    })

    await expect(
      studioUpload.persistStudioMedia(
        'https://cdn.example.com/me/studio_image/a.png',
        'studio_image'
      )
    ).resolves.toBe('https://cdn.example.com/me/studio_image/a.png')
    expect(apiMock.post).not.toHaveBeenCalled()
  })

  it('uploads the bytes when the browser can read them', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(new Blob(['image-bytes'], { type: 'image/png' }), {
          status: 200,
        })
      )
    )
    apiMock.post.mockResolvedValue({
      data: { data: { url: 'https://cdn.example.com/a.png' } },
    })

    await expect(
      studioUpload.persistStudioMedia(
        'https://upstream.example.com/a.png',
        'studio_image'
      )
    ).resolves.toBe('https://cdn.example.com/a.png')
    expect(apiMock.post).toHaveBeenCalledTimes(1)
    const [path, body] = apiMock.post.mock.calls[0]
    expect(path).toBe('/api/user/oss/upload')
    expect((body as FormData).get('scene')).toBe('studio_image')
  })

  it('falls back to the gateway transfer for cross origin media', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('cors')))
    apiMock.post.mockResolvedValue({
      data: { data: { url: 'https://cdn.example.com/a.jpg' } },
    })

    await expect(
      studioUpload.persistStudioMedia(
        'https://upstream.example.com/a.jpg',
        'studio_image'
      )
    ).resolves.toBe('https://cdn.example.com/a.jpg')
    expect(apiMock.post).toHaveBeenCalledWith('/api/user/oss/object', {
      url: 'https://upstream.example.com/a.jpg',
      scene: 'studio_image',
    })
  })

  it('keeps the upstream url when every transfer path fails', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('cors')))
    apiMock.post.mockRejectedValue(new Error('transfer failed'))

    await expect(
      studioUpload.persistStudioMedia(
        'https://upstream.example.com/a.jpg',
        'studio_image'
      )
    ).resolves.toBe('https://upstream.example.com/a.jpg')
  })
})

describe('generateStudioVideoCover', () => {
  it('renders the poster frame with the browser when it can decode', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(new Blob(['video-bytes'], { type: 'video/mp4' }), {
          status: 200,
        })
      )
    )
    extractVideoCoverMock.mockResolvedValue(
      new Blob(['cover'], { type: 'image/webp' })
    )
    apiMock.post.mockResolvedValue({
      data: { data: { url: 'https://cdn.example.com/me/cover.webp' } },
    })

    await expect(
      studioUpload.generateStudioVideoCover('https://cdn.example.com/me/v.mp4')
    ).resolves.toEqual({ coverUrl: 'https://cdn.example.com/me/cover.webp' })
    expect(apiMock.post).toHaveBeenCalledTimes(1)
    expect(apiMock.post).toHaveBeenCalledWith(
      '/api/user/oss/upload',
      expect.any(FormData)
    )
  })

  it('asks the gateway to render when the browser cannot read the video', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('cors')))
    apiMock.post.mockImplementation((path: string) => {
      if (path === '/api/user/oss/video-cover') {
        return Promise.resolve({
          data: {
            data: {
              url: 'https://upstream.example.com/v.mp4',
              cover_url: 'https://cdn.example.com/me/cover.webp',
            },
          },
        })
      }
      return Promise.reject(new Error('transfer failed'))
    })

    await expect(
      studioUpload.generateStudioVideoCover(
        'https://upstream.example.com/v.mp4'
      )
    ).resolves.toEqual({ coverUrl: 'https://cdn.example.com/me/cover.webp' })
    expect(apiMock.post).toHaveBeenCalledWith('/api/user/oss/video-cover', {
      url: 'https://upstream.example.com/v.mp4',
    })
  })

  it('reuses the gateway copy of the transferred video', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockRejectedValueOnce(new Error('cors'))
        .mockResolvedValue(
          new Response(new Blob(['video-bytes'], { type: 'video/mp4' }), {
            status: 200,
          })
        )
    )
    apiMock.post.mockImplementation((path: string) => {
      if (path === '/api/user/oss/object') {
        return Promise.resolve({
          data: {
            data: { url: 'https://cdn.example.com/me/studio_video/v.mp4' },
          },
        })
      }
      if (path === '/api/user/oss/video-cover') {
        return Promise.resolve({
          data: {
            data: {
              url: 'https://cdn.example.com/me/studio_video/v.mp4',
              cover_url: 'https://cdn.example.com/me/cover.webp',
            },
          },
        })
      }
      return Promise.reject(new Error('unexpected request'))
    })

    await expect(
      studioUpload.generateStudioVideoCover(
        'https://upstream.example.com/v.mp4'
      )
    ).resolves.toEqual({
      coverUrl: 'https://cdn.example.com/me/cover.webp',
      url: 'https://cdn.example.com/me/studio_video/v.mp4',
    })
    expect(apiMock.post).toHaveBeenCalledWith('/api/user/oss/video-cover', {
      url: 'https://cdn.example.com/me/studio_video/v.mp4',
    })
  })

  it('surfaces the gateway error so the retry classifier can react', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('cors')))
    apiMock.post.mockImplementation((path: string) =>
      path === '/api/user/oss/video-cover'
        ? Promise.reject(
            new Error(
              'Server side cover generation is unavailable: ffmpeg is not installed'
            )
          )
        : Promise.reject(new Error('transfer failed'))
    )

    await expect(
      studioUpload.generateStudioVideoCover(
        'https://upstream.example.com/v.mp4'
      )
    ).rejects.toThrow('ffmpeg is not installed')
  })
})

describe('persistStudioVideo', () => {
  it('stores the video and skips the cover when it cannot be decoded', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(
      function (this: HTMLMediaElement) {
        this.dispatchEvent(new Event('loadeddata'))
      }
    )
    Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', {
      configurable: true,
      get: () => 0,
      set(this: HTMLMediaElement) {
        this.dispatchEvent(new Event('seeked'))
      },
    })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(new Blob(['video-bytes'], { type: 'video/mp4' }), {
          status: 200,
        })
      )
    )
    apiMock.post.mockResolvedValue({
      data: { data: { url: 'https://cdn.example.com/v.mp4' } },
    })

    await expect(
      studioUpload.persistStudioVideo('/v1/videos/abc/content')
    ).resolves.toEqual({ url: 'https://cdn.example.com/v.mp4' })
  })

  it('keeps videos that the caller storage already serves', async () => {
    apiMock.get.mockResolvedValue({
      data: {
        data: {
          configured: true,
          public_base_url: 'https://cdn.example.com/me',
        },
      },
    })

    await expect(
      studioUpload.persistStudioVideo(
        'https://cdn.example.com/me/studio_video/v.mp4'
      )
    ).resolves.toEqual({ url: 'https://cdn.example.com/me/studio_video/v.mp4' })
    expect(apiMock.post).not.toHaveBeenCalled()
  })
})
