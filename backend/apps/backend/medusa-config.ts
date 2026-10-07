import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

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
