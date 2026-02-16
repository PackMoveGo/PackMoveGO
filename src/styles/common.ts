export const styles = {
  container: 'container mx-auto px-4',
  section: {
    default: 'py-20',
    hero: 'relative min-h-[800px] flex items-center overflow-hidden',
  },
  heading: {
    h1: 'text-4xl sm:text-5xl md:text-7xl font-bold mb-6 leading-tight text-black',
    h2: 'text-4xl font-bold text-center mb-16 text-black',
    h3: 'text-xl font-semibold mb-3 text-black',
  },
  button: {
    primary: 'bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition',
    secondary: 'border border-blue-600 text-blue-600 py-2 rounded-md hover:bg-blue-50 transition',
    cta: 'w-full h-12 bg-blue-600 text-white px-6 rounded-lg hover:bg-blue-700 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] font-semibold shadow-md hover:shadow-lg',
    bookNow: 'inline-block bg-blue-600 text-white px-4 py-2 rounded-full font-semibold hover:bg-blue-700 transition-colors duration-200',
    menuToggle: 'md:hidden p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md transition-colors duration-200'
  },
  input: {
    default: 'w-full h-12 px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow',
  },
  card: {
    default: 'bg-white p-8 rounded-xl shadow-sm hover:shadow-md transition',
    glass: 'bg-white/10 backdrop-blur-md rounded-xl p-6',
  },
  grid: {
    services: 'grid grid-cols-1 md:grid-cols-3 gap-8',
    form: 'grid grid-cols-1 md:grid-cols-3 gap-4',
  },
  text: {
    body: 'text-lg sm:text-xl md:text-2xl text-black mb-8 max-w-2xl',
    price: 'text-blue-600 font-semibold mb-2',
    description: 'text-black mb-2',
  },
  navbar: {
    wrapper: 'bg-white shadow-sm relative z-50',
    container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
    header: 'h-16 flex items-center justify-between bg-white relative',
    logo: 'flex-shrink-0 text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors duration-200 relative z-50',
    desktopNav: 'hidden md:flex items-center space-x-1 flex-1 justify-center',
    link: {
      default: 'px-3 py-2 border-b-2 text-sm font-medium transition-all duration-200',
      active: 'border-blue-500 text-black',
      inactive: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
    },
    mobileNav: {
      wrapper: 'md:hidden transition-all duration-200',
      container: 'px-2 pt-2 pb-3 space-y-1',
      link: {
        default: 'block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200',
        active: 'bg-blue-50 text-black',
        inactive: 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
      }
    },
    search: {
      wrapper: 'sticky top-16 z-40 w-full bg-white border-t border-gray-200 transition-all duration-150 ease-in-out',
      container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2',
      content: 'flex items-center gap-4'
    }
  }
}; 