import { authenticate, configureStoreSearch, defineMiddlewares, validateAndTransformBody } from '@medusajs/framework/http'
import { RejectMatesListingSchema, UpdateMatesReportSchema } from './admin/mates/validators'
import {
  CreateVetProviderSchema,
  UpdateVetAppointmentSchema,
  UpdateVetProviderSchema,
} from './admin/vet/validators'
import { parsePhotoUpload } from './store/mates/upload-middleware'
import {
  CounterMatesOfferSchema,
  CreateMatesListingSchema,
  CreateMatesMessageSchema,
  CreateMatesOfferSchema,
  CreateMatesReportSchema,
  UpdateMatesListingSchema,
} from './store/mates/validators'
import { CreateStoreVetAppointmentSchema } from './store/vet/validators'

// Mates routes that act for a customer use the Medusa customer session (or a bearer token).
// Browsing listings stays public.
const customerAuth = authenticate('customer', ['session', 'bearer'])

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
    {
      method: ['POST'],
      matcher: '/store/mates/listings',
      middlewares: [customerAuth, validateAndTransformBody(CreateMatesListingSchema)],
    },
    {
      method: ['POST'],
      matcher: '/store/mates/listings/:id/offers',
      middlewares: [customerAuth, validateAndTransformBody(CreateMatesOfferSchema)],
    },
    {
      method: ['POST'],
      matcher: '/store/mates/listings/:id/report',
      middlewares: [customerAuth, validateAndTransformBody(CreateMatesReportSchema)],
    },
    {
      matcher: '/store/mates/my/*',
      middlewares: [customerAuth],
    },
    {
      method: ['POST'],
      matcher: '/store/mates/my/listings/:id',
      middlewares: [validateAndTransformBody(UpdateMatesListingSchema)],
    },
    {
      matcher: '/store/mates/offers/*',
      middlewares: [customerAuth],
    },
    {
      method: ['POST'],
      matcher: '/store/mates/offers/:id/counter',
      middlewares: [validateAndTransformBody(CounterMatesOfferSchema)],
    },
    {
      method: ['POST'],
      matcher: '/store/mates/offers/:id/messages',
      middlewares: [validateAndTransformBody(CreateMatesMessageSchema)],
    },
    {
      // Auth runs first, so an anonymous upload is refused before the file is read.
      method: ['POST'],
      matcher: '/store/mates/uploads',
      middlewares: [customerAuth, parsePhotoUpload],
    },
    {
      method: ['POST'],
      matcher: '/admin/mates/listings/:id/reject',
      middlewares: [validateAndTransformBody(RejectMatesListingSchema)],
    },
    {
      method: ['POST'],
      matcher: '/admin/mates/reports/:id',
      middlewares: [validateAndTransformBody(UpdateMatesReportSchema)],
    },
  ],
})
