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
import { Check, Copy, Loader2 } from 'lucide-react'
import { useState, type ReactElement, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useCopyToClipboard } from '@/hooks/use-copy-to-clipboard'
import { cn } from '@/lib/utils'

type CopyButtonValue = string | (() => string | null | Promise<string | null>)

interface CopyButtonProps {
  value: CopyButtonValue
  children?: ReactNode
  className?: string
  iconClassName?: string
  variant?: 'ghost' | 'outline' | 'default' | 'secondary' | 'destructive'
  size?: 'default' | 'xs' | 'sm' | 'lg' | 'icon' | 'icon-sm'
  tooltip?: string
  successTooltip?: string
  position?: 'left' | 'right'
  disabled?: boolean
  'aria-label'?: string
}

export function CopyButton({
  value,
  children,
  className,
  iconClassName,
  variant = 'ghost',
  size = 'icon',
  tooltip,
  successTooltip,
  position = 'left',
  disabled = false,
  'aria-label': ariaLabel,
}: CopyButtonProps) {
  const { t } = useTranslation()
  const { copiedText, copyToClipboard } = useCopyToClipboard({ notify: false })
  const [isResolving, setIsResolving] = useState(false)
  const [resolvedValue, setResolvedValue] = useState<string | null>(null)
  const clickedValue = typeof value === 'string' ? value : resolvedValue
  const isCopied = clickedValue !== null && copiedText === clickedValue
  const resolvedTooltip = tooltip ?? t('Copy to clipboard')
  const resolvedSuccessTooltip = successTooltip ?? t('Copied!')
  const resolvedAriaLabel = ariaLabel ?? resolvedTooltip
  const copiedAriaLabel = t('Copied')

  const handleClick = async () => {
    if (typeof value === 'string') {
      await copyToClipboard(value)
      return
    }

    setIsResolving(true)
    try {
      const resolved = await value()
      if (!resolved) return
      setResolvedValue(resolved)
      await copyToClipboard(resolved)
    } finally {
      setIsResolving(false)
    }
  }

  let icon: ReactElement = <Copy className={cn(iconClassName)} />
  if (isResolving) {
    icon = <Loader2 className={cn('animate-spin', iconClassName)} />
  } else if (isCopied) {
    icon = <Check className={cn('text-success', iconClassName)} />
  }

  const button = (
    <Button
      variant={variant}
      size={size}
      className={cn('shrink-0', position === 'right' && 'gap-x-2', className)}
      onClick={() => void handleClick()}
      disabled={disabled}
      aria-label={isCopied ? copiedAriaLabel : resolvedAriaLabel}
    >
      {position === 'right' && children}
      {icon}
      {position === 'left' && children}
    </Button>
  )

  if (tooltip || successTooltip) {
    return (
      <Tooltip>
        <TooltipTrigger render={button} />
        <TooltipContent>
          <p>{isCopied ? resolvedSuccessTooltip : resolvedTooltip}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return button
}
