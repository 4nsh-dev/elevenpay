/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#0B0F14',
          raised: '#11161D',
        },
        surface: {
          card: '#161B22',
          'card-hover': '#1B212A',
          slate: '#1E293B',
        },
        brand: {
          primary: '#00C853',
          'primary-press': '#00B04A',
        },
        accent: {
          gold: '#FFD54F',
        },
        state: {
          success: '#00E676',
          error: '#FF5252',
          warning: '#FFB300',
          pending: '#64B5F6',
        },
        content: {
          primary: '#FFFFFF',
          secondary: '#94A3B8',
          tertiary: '#5B6878',
          'on-primary': '#04110A',
        },
      },
      borderRadius: {
        card: '24px',
        button: '18px',
        input: '16px',
        sheet: '28px',
      },
      spacing: {
        gutter: '24px',
        section: '32px',
      },
      fontFamily: {
        inter: ['Inter_400Regular'],
        'inter-medium': ['Inter_500Medium'],
        'inter-semibold': ['Inter_600SemiBold'],
        'inter-bold': ['Inter_700Bold'],
      },
    },
  },
  plugins: [],
};
