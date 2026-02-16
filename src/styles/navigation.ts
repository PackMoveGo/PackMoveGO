export const navigationStyles = {
  // Main Navigation Container
  wrapper: 'bg-white shadow-sm relative z-50',
  container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  header: 'h-16 flex items-center justify-between bg-white relative z-[60]',
  logo: 'flex-shrink-0 text-2xl font-bold text-blue-600 hover:text-blue-700 transition-colors duration-200 relative z-[60] mr-8',

  // Desktop Navigation
  desktop: {
    nav: 'flex items-center space-x-1 justify-end flex-1 min-w-0',
    link: {
      base: 'px-3 py-2 border-b-2 text-sm font-medium transition-all duration-300 ease-out text-gray-700 whitespace-nowrap flex-shrink-0',
      active: 'border-blue-500 text-gray-900',
      inactive: 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
    }
  },

  // Mobile Navigation
  mobileBottom: {
    wrapper: 'relative hidden',
    menuButton: 'p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md transition-colors duration-200 relative z-[60]',
    menuButtonActive: 'bg-blue-50 text-blue-600',
    overlay: 'fixed left-0 right-0 top-16 bottom-0 bg-black bg-opacity-25 transition-opacity duration-300 ease-in-out z-40',
    panel: 'fixed right-4 top-20 bg-white shadow-lg overflow-y-auto flex flex-col z-50 rounded-lg transform transition-all duration-300 ease-in-out w-48 max-w-[280px]',
    panelOpen: 'min-h-[200px] max-h-[60vh] translate-y-0',
    panelClosed: 'h-0 -translate-y-full',
    content: 'flex-1 py-3 px-4 space-y-2 overflow-y-auto w-full',
    link: {
      base: 'block w-full px-4 py-3 text-base font-medium transition-all duration-300 ease-out transform break-words whitespace-normal',
      active: 'bg-blue-50 text-blue-700 border-l-4 border-blue-600',
      inactive: 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
    },
    bookNowWrapper: 'p-4 border-t border-gray-200 flex-shrink-0 w-full',
    bookNowButton: 'w-full h-10 bg-blue-600 text-white px-4 rounded-lg hover:bg-blue-700 transition-all duration-300 ease-out transform hover:scale-[1.02] active:scale-[0.98] font-semibold shadow-md hover:shadow-lg flex items-center justify-center text-base font-medium'
  },

  // Search Bar
  search: {
    wrapper: 'sticky top-16 z-40 w-full bg-transparent border-t border-gray-200 transition-all duration-150 ease-in-out py-2',
    container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
    content: 'flex items-center gap-4 w-full',
    form: 'relative flex-1 w-full',
    input: 'w-full h-10 px-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm text-base bg-white',
    iconWrapper: 'absolute left-0 inset-y-0 pl-3 flex items-center pointer-events-none',
    icon: 'h-5 w-5 text-gray-400',
    clearButton: 'absolute right-0 inset-y-0 pr-3 flex items-center cursor-pointer',
    clearIcon: 'h-5 w-5 text-gray-400 hover:text-gray-500',
    signInButton: 'flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 whitespace-nowrap font-medium',
    results: {
      wrapper: 'absolute left-0 right-0 mt-2 bg-white shadow-xl rounded-lg border border-gray-200 max-h-96 overflow-y-auto z-50',
      container: 'py-2',
      item: 'w-full text-left px-4 py-2 hover:bg-gray-50 focus:outline-none focus:bg-gray-50',
      title: 'text-sm font-medium text-gray-900',
      description: 'text-sm text-gray-500'
    }
  }
}; 