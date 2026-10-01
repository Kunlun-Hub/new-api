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
import { useQuery } from '@tanstack/react-query'

import { getPricing } from '@/features/pricing/api'

/** Public catalog metadata the studio chat uses to describe a model. */
export type StudioModelInfo = {
  vendorName: string
  capabilities: string[]
  inputModalities: string[]
}

export type StudioModelCatalog = Map<string, StudioModelInfo>

/**
 * Model metadata from the public pricing catalog (vendor, capabilities,
 * modalities). Models missing from the catalog simply have no metadata.
 */
export function useStudioModelCatalog() {
  const query = useQuery({
    queryKey: ['studio-model-catalog'],
    queryFn: async (): Promise<StudioModelCatalog> => {
      const pricing = await getPricing()
      const vendorNames = new Map(
        (pricing.vendors ?? []).map((vendor) => [vendor.id, vendor.name])
      )
      const catalog: StudioModelCatalog = new Map()

      for (const model of pricing.data ?? []) {
        catalog.set(model.model_name, {
          vendorName:
            model.vendor_name ||
            (model.vendor_id === undefined
              ? ''
              : (vendorNames.get(model.vendor_id) ?? '')),
          capabilities: model.capabilities ?? [],
          inputModalities: model.input_modalities ?? [],
        })
      }

      return catalog
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  return { catalog: query.data, isLoading: query.isPending }
}
