const CHARS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
export const generateCaptcha = () => Array.from({ length: 4 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('')
