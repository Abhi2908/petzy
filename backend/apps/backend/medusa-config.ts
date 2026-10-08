import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

// Email notifications go through Resend when both RESEND_API_KEY and NOTIFY_FROM_EMAIL are set, and are
// written to the server log otherwise (the default in development). See src/notifications.
const emailProvider =
  process.env.RESEND_API_KEY && process.env.NOTIFY_FROM_EMAIL
    ? {
        resolve: './src/modules/notification-resend',
        id: 'resend',
        options: {
          channels: ['email'],
          api_key: process.env.RESEND_API_KEY,
          from: process.env.NOTIFY_FROM_EMAIL,
        },
      }
    : {
        resolve: './src/modules/notification-log',
        id: 'log',
        options: { channels: ['email'] },
      }

module.exports = defineConfig({
  projectConfig: {
    databaseUrl: process.env.DATABASE_URL,
    http: {
      storeCors: process.env.STORE_CORS!,
      adminCors: process.env.ADMIN_CORS!,
      authCors: process.env.AUTH_CORS!,
      jwtSecret: process.env.JWT_SECRET,
      cookieSecret: process.env.COOKIE_SECRET,
    }
  },
  modules: [
    {
      resolve: './src/modules/vet',
    },
    {
      resolve: './src/modules/mates',
    },
    {
      resolve: './src/modules/insurance',
    },
    // Transactional notifications. Each provider owns one channel. Medusa's own "feed" provider stays, for
    // the Admin notification feed. To add SMS later, add a provider with channels: ['sms'] here (see
    // src/notifications/send.ts).
    {
      resolve: '@medusajs/medusa/notification',
      options: {
        providers: [
          {
            resolve: '@medusajs/medusa/notification-local',
            id: 'local',
            options: { name: 'Local Notification Provider', channels: ['feed'] },
          },
          emailProvider,
        ],
      },
    },
    // Mates photo uploads. Local disk for now (served from /static). To move to Cloudflare R2,
    // replace this provider with `@medusajs/medusa/file-s3` and the R2 endpoint, bucket and keys.
    {
      resolve: '@medusajs/medusa/file',
      options: {
        providers: [
          {
            resolve: '@medusajs/medusa/file-local',
            id: 'local',
            options: {
              upload_dir: 'static',
              backend_url: `${process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000'}/static`,
            },
          },
        ],
      },
    },
  ],
})
