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
import { Tabs as TabsPrimitive } from '@base-ui/react/tabs'
import { motion } from 'motion/react'
import {
  createContext,
  use,
  useCallback,
  useId,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import { cn } from '@/lib/utils'

interface PillTabsContextValue {
  activeValue: unknown
  layoutId: string
}

const PillTabsContext = createContext<PillTabsContextValue | null>(null)

type PillTabsProps = Omit<
  TabsPrimitive.Root.Props,
  'value' | 'defaultValue' | 'onValueChange'
> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}

function PillTabs({
  className,
  value,
  defaultValue,
  onValueChange,
  ...props
}: PillTabsProps) {
  const isControlled = value !== undefined
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue)
  const activeValue = isControlled ? value : uncontrolledValue
  const layoutId = useId()

  const handleValueChange = useCallback(
    (nextValue: unknown) => {
      if (typeof nextValue !== 'string') return

      if (!isControlled) {
        setUncontrolledValue(nextValue)
      }
      onValueChange?.(nextValue)
    },
    [isControlled, onValueChange]
  )

  const contextValue = useMemo(
    () => ({ activeValue, layoutId }),
    [activeValue, layoutId]
  )

  return (
    <PillTabsContext value={contextValue}>
      <TabsPrimitive.Root
        data-slot='pill-tabs'
        value={value}
        defaultValue={defaultValue}
        onValueChange={handleValueChange}
        className={cn('flex flex-col gap-2', className)}
        {...props}
      />
    </PillTabsContext>
  )
}

function PillTabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot='pill-tabs-list'
      className={cn(
        'inline-flex w-fit flex-wrap items-center justify-center gap-1 rounded-full bg-transparent p-1',
        className
      )}
      {...props}
    />
  )
}

function PillTabsTrigger({
  className,
  value,
  children,
  ...props
}: TabsPrimitive.Tab.Props & { children?: ReactNode }) {
  const context = use(PillTabsContext)
  if (!context) {
    throw new Error('PillTabsTrigger must be used within PillTabs')
  }

  return (
    <TabsPrimitive.Tab
      data-slot='pill-tabs-trigger'
      value={value}
      className={cn(
        'text-primary relative inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap transition-colors',
        'data-active:bg-transparent! data-active:text-primary-foreground!',
        'focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50',
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {context.activeValue === value ? (
        <motion.span
          layoutId={context.layoutId}
          className='bg-primary absolute inset-0 rounded-full'
          transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
        />
      ) : null}
      <span className='relative z-10 inline-flex items-center gap-1.5'>
        {children}
      </span>
    </TabsPrimitive.Tab>
  )
}

function PillTabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot='pill-tabs-content'
      className={cn('flex-1 outline-none data-hidden:hidden', className)}
      {...props}
    />
  )
}

export { PillTabs, PillTabsList, PillTabsTrigger, PillTabsContent }
