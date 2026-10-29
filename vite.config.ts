import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Backend-ийн CORS_ALLOWED_ORIGINS=http://localhost:3000 тул 3000 порт
export default defineConfig({
    plugins: [react()],
    server: { port: 3000, strictPort: true }
})
