/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { describe, expect, it } from 'vitest'

import { parseFooterColumns } from '../footer-columns'

describe('parseFooterColumns', () => {
  it('returns null for empty or invalid input', () => {
    expect(parseFooterColumns(undefined)).toBeNull()
    expect(parseFooterColumns('   ')).toBeNull()
    expect(parseFooterColumns('{')).toBeNull()
    expect(parseFooterColumns('{"title":"About"}')).toBeNull()
    expect(parseFooterColumns('[{"title":"About"}]')).toBeNull()
    expect(
      parseFooterColumns('[{"title":"About","links":[{"text":"Docs"}]}]')
    ).toBeNull()
  })

  it('parses configured footer columns', () => {
    const columns = parseFooterColumns(
      '[{"title":"关于我们","links":[{"text":"关于项目","href":"https://example.com/about"},{"text":"工单","href":"/tickets"}]}]'
    )
    expect(columns).toEqual([
      {
        title: '关于我们',
        links: [
          { text: '关于项目', href: 'https://example.com/about' },
          { text: '工单', href: '/tickets' },
        ],
      },
    ])
  })

  it('keeps columns without links', () => {
    expect(parseFooterColumns('[{"title":"联系我们","links":[]}]')).toEqual([
      { title: '联系我们', links: [] },
    ])
  })
})
