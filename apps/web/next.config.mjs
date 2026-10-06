const api = new URL(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1');
/** @type {import('next').NextConfig} */
export default {
  transpilePackages: ['@lsf/shared-types'],
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'https', hostname: 'ffxguzsjsxhixfewzvlf.supabase.co', pathname: '/storage/v1/object/public/**' },
      { protocol: api.protocol.replace(':', ''), hostname: api.hostname, port: api.port },
    ],
  },
};
