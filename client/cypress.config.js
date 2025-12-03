const { defineConfig } = require('cypress')

// Allow overriding via environment variable CYPRESS_BASE_URL
const baseUrl = process.env.CYPRESS_BASE_URL || process.env.npm_config_baseUrl || 'http://localhost:3001'

module.exports = defineConfig({
  e2e: {
    baseUrl,
    supportFile: false,
    specPattern: 'cypress/e2e/**/*.spec.js'
  }
})
