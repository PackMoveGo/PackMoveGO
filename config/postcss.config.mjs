/**
 * PostCSS Configuration for PackMoveGo Application
 * 
 * PostCSS is a tool for transforming CSS with JavaScript plugins.
 * This configuration processes CSS after Tailwind CSS and applies
 * additional optimizations for production builds.
 * 
 * Processing Order:
 * 1. Nesting (enables CSS nesting support)
 * 2. Tailwind CSS (generates utility classes)
 * 3. Autoprefixer (adds vendor prefixes)
 * 4. CSSnano (minifies CSS in production)
 */

import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'
import cssnano from 'cssnano'
import nesting from 'tailwindcss/nesting/index.js'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default {
  // =============================================================================
  // PLUGINS CONFIGURATION
  // =============================================================================
  // NOTE: Plugins are processed in order (top to bottom)
  // - Each plugin transforms the CSS output from the previous plugin
  // - Order matters: Nesting → Tailwind → Autoprefixer → CSSnano
  // EDIT GUIDE: Add new plugins here, maintain proper processing order
  plugins: [
    // =========================================================================
    // NESTING PLUGIN
    // =========================================================================
    // NOTE: Enables CSS nesting support for better CSS organization
    // - Allows nested selectors and rules
    // - Improves CSS readability and maintainability
    // - Compatible with modern CSS nesting syntax
    nesting,
    
    // =========================================================================
    // TAILWIND CSS PLUGIN
    // =========================================================================
    // NOTE: Generates utility classes based on your Tailwind configuration
    // - Scans your content files for class usage
    // - Generates only the CSS you actually use
    // - Processes @tailwind directives in your CSS files
    // - Uses explicit path to Tailwind config for better reliability
    tailwindcss(resolve(__dirname, './tailwind.config.js')),
    
    // =========================================================================
    // AUTOPREFIXER PLUGIN
    // =========================================================================
    // NOTE: Automatically adds vendor prefixes for browser compatibility
    // - Adds prefixes like -webkit-, -moz-, -ms- where needed
    // - Uses data from caniuse.com to determine which prefixes are required
    // - Ensures CSS works across different browsers and versions
    autoprefixer,
    
    // =========================================================================
    // PRODUCTION OPTIMIZATIONS
    // =========================================================================
    // NOTE: CSSnano is only applied in production builds
    // - Significantly reduces CSS file size through minification
    // - Removes comments, whitespace, and optimizes selectors
    // - Uses 'default' preset for balanced optimization
    // EDIT GUIDE: Modify preset or add custom CSSnano options as needed
    ...(process.env.NODE_ENV === 'production'
      ? [cssnano({ 
          preset: 'default',
          // Additional CSSnano options can be added here:
          // discardComments: { removeAll: true },
          // normalizeWhitespace: true,
          // minifyFontValues: true,
          // minifySelectors: true
        })]
      : [])
  ],
  
  // =============================================================================
  // CONFIGURATION NOTES
  // =============================================================================
  // 
  // Development vs Production:
  // - Development: Nesting + Tailwind + Autoprefixer (faster builds, better debugging)
  // - Production: Nesting + Tailwind + Autoprefixer + CSSnano (optimized, minified)
  //
  // File Processing:
  // - This config processes all CSS files in your project
  // - Works with Vite's CSS processing pipeline
  // - Compatible with Tailwind's JIT (Just-In-Time) mode
  // - Supports modern CSS nesting syntax
  //
  // Performance:
  // - Development builds are optimized for speed
  // - Production builds are optimized for file size
  // - CSSnano can reduce file size by 30-50%
  //
  // Module System:
  // - Uses ES modules (import/export) for better tree-shaking
  // - Compatible with modern build tools and bundlers
} 