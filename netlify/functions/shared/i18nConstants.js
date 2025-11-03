// Shared i18n constants for backend functions
// This should be kept in sync with frontend/src/i18n/config.js

export const I18N_CONSTANTS = {
  // Default and fallback locale
  DEFAULT_LOCALE: 'en',
  FALLBACK_LOCALE: 'en',
  
  // Locale codes
  LOCALE: {
    EN: 'en',
    ES: 'es',
    FR: 'fr',
    DE: 'de',
    JA: 'ja',
    HI: 'hi',
    BN: 'bn'
  },
  
  // Language name mapping for AI context
  LANGUAGE_NAMES: {
    'en': 'English',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'ja': 'Japanese',
    'hi': 'Hindi',
    'bn': 'Bengali'
  },
  
  // Error messages by locale
  ERROR_MESSAGES: {
    MESSAGE_REQUIRED: {
      'en': 'Message is required',
      'es': 'El mensaje es requerido',
      'fr': 'Le message est requis',
      'de': 'Nachricht ist erforderlich',
      'ja': 'メッセージが必要です',
      'hi': 'संदेश आवश्यक है',
      'bn': 'বার্তা প্রয়োজন'
    }
  }
}

