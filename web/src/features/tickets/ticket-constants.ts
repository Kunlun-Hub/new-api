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
import { cn } from '@/lib/utils'

export const TICKET_CATEGORY_LABELS: Record<string, string> = {
  billing: 'Billing',
  technical: 'Technical',
  account: 'Account',
  other: 'Other',
}

/** Markdown container of a ticket message, matching the reference console. */
export const TICKET_MESSAGE_MARKDOWN_CLASS = cn(
  'text-sm leading-relaxed wrap-break-word',
  '[&_p]:my-0 [&_p+p]:mt-2',
  '[&_a]:underline [&_a]:underline-offset-2',
  '[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5',
  '[&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5',
  '[&_blockquote]:my-1 [&_blockquote]:border-l-2 [&_blockquote]:border-current/30 [&_blockquote]:pl-3 [&_blockquote]:opacity-80',
  '[&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-black/10 [&_pre]:p-3 [&_pre]:text-xs dark:[&_pre]:bg-white/10',
  '[&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1 [&_code]:py-0.5',
  '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
  '[&_img]:my-2 [&_img]:max-h-60 [&_img]:rounded-lg',
  '[&_table]:my-2 [&_table]:w-full',
  '[&_th]:border [&_th]:border-border/60 [&_th]:px-3 [&_th]:py-1',
  '[&_td]:border [&_td]:border-border/60 [&_td]:px-3 [&_td]:py-1.5'
)
