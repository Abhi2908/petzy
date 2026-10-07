import { configureStoreSearch, defineMiddlewares, validateAndTransformBody } from '@medusajs/framework/http'
import {
  CreateVetProviderSchema,
  UpdateVetAppointmentSchema,
  UpdateVetProviderSchema,
} from './admin/vet/validators'
import { CreateStoreVetAppointmentSchema } from './store/vet/validators'

// The product index declares filterable `status` and `sales_channel_ids`, so
// the route narrows it to published products in the key's sales channels.
export default defineMiddlewares({
  routes: [
    {
      method: ['POST'],
      matcher: '/store/search',
      middlewares: [
        configureStoreSearch({
          allowed_indexes: {
            product: true,
          },
        }),
      ],
    },
    {
      method: ['POST'],
      matcher: '/admin/vet/providers',
      middlewares: [validateAndTransformBody(CreateVetProviderSchema)],
    },
    {
      method: ['POST'],
      matcher: '/admin/vet/providers/:id',
      middlewares: [validateAndTransformBody(UpdateVetProviderSchema)],
    },
    {
      method: ['POST'],
      matcher: '/admin/vet/appointments/:id',
      middlewares: [validateAndTransformBody(UpdateVetAppointmentSchema)],
    },
    {
      method: ['POST'],
      matcher: '/store/vet/appointments',
      middlewares: [validateAndTransformBody(CreateStoreVetAppointmentSchema)],
    },
  ],
})
