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
type ParametersMarkerProps = {
  label: string
}

/** Section separator with a centered label inside the parameters panels. */
export function ParametersMarker(props: ParametersMarkerProps) {
  return (
    <div className='group/marker text-muted-foreground before:bg-border/60 after:bg-border/60 flex min-h-4 w-full items-center gap-2 text-left text-xs before:mr-1 before:h-px before:min-w-0 before:flex-1 after:ml-1 after:h-px after:min-w-0 after:flex-1'>
      <span className='min-w-0 flex-none text-center'>{props.label}</span>
    </div>
  )
}
