const security = [
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Cache-Control", value: "no-store" },
];
/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  async headers() { return [{ source: "/((?!_next/static|_next/image).*)", headers: security }]; },
};
