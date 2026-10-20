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
import React, { useState } from 'react'

import useDialogState from '@/hooks/use-dialog'

import type { RedPacket, RedPacketsDialogType } from '../types'

type RedPacketsContextType = {
  open: RedPacketsDialogType | null
  setOpen: (str: RedPacketsDialogType | null) => void
  currentRow: RedPacket | null
  setCurrentRow: React.Dispatch<React.SetStateAction<RedPacket | null>>
  refreshTrigger: number
  triggerRefresh: () => void
}

const RedPacketsContext = React.createContext<RedPacketsContextType | null>(
  null
)

export function RedPacketsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [open, setOpen] = useDialogState<RedPacketsDialogType>(null)
  const [currentRow, setCurrentRow] = useState<RedPacket | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const triggerRefresh = () => setRefreshTrigger((prev) => prev + 1)

  return (
    <RedPacketsContext
      value={{
        open,
        setOpen,
        currentRow,
        setCurrentRow,
        refreshTrigger,
        triggerRefresh,
      }}
    >
      {children}
    </RedPacketsContext>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useRedPackets = () => {
  const redPacketsContext = React.useContext(RedPacketsContext)

  if (!redPacketsContext) {
    throw new Error('useRedPackets has to be used within <RedPacketsProvider>')
  }

  return redPacketsContext
}
