/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                brand: {
                    DEFAULT: "#111827",
                    accent: "#111111",
                },
            },
            borderRadius: {
                '2xl': '1rem',
            },
            boxShadow: {
                soft: '0 10px 30px rgba(0,0,0,0.08)'
            }
        },
    },
    plugins: [],
}