/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './src/routes/**/*.{html,js,svelte,ts}'
  ],
  theme: {
    extend: {
      fontFamily: {
        'headline': ['Sora', 'sans-serif'],
        'body': ['Noto Sans', 'system-ui', 'sans-serif']
      },
      colors: {
        beyer: {
          blue: '#007AFF',
          purple: '#5856D6',
          gray: {
            50: '#f5f5f7',
            100: '#f0f0f0',
            200: '#e0e0e0', 
            300: '#d0d0d0',
            500: '#86868b',
            800: '#1d1d1f',
            900: '#333333'
          }
        }
      },
      spacing: {
        '6px': '6px',
        '12px': '12px',
        '18px': '18px',
        '24px': '24px',
        '30px': '30px',
        '36px': '36px',
        '42px': '42px',
        '48px': '48px'
      },
      borderRadius: {
        'beyer': '12px'
      },
      boxShadow: {
        'beyer': '0 2px 8px rgba(0, 0, 0, 0.1)',
        'beyer-focus': '0 0 0 3px rgba(0, 122, 255, 0.1)',
        'beyer-hover': '0 4px 12px rgba(0, 122, 255, 0.3)'
      },
      gradients: {
        'beyer': 'linear-gradient(135deg, #007AFF 0%, #5856D6 100%)'
      }
    }
  },
  plugins: []
};