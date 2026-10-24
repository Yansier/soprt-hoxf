const USER_KEY = 'hoxf_user'

export function getCurrentUser() {
  try {
    const value = JSON.parse(localStorage.getItem(USER_KEY) || 'null')
    return value?.loggedIn && value?.name ? value : null
  } catch {
    localStorage.removeItem(USER_KEY)
    return null
  }
}

export function registerUser(name, email) {
  const registeredAt = Date.now()
  const user = { name: name.trim(), email: email.trim(), loggedIn: true, vip: true, registeredAt, vipExpireAt: registeredAt + 365 * 24 * 60 * 60 * 1000 }
  localStorage.setItem(USER_KEY, JSON.stringify(user))
  return user
}

export function getVipRemainingDays(user = getCurrentUser()) {
  if (!user?.vipExpireAt) return 0
  return Math.max(0, Math.ceil((user.vipExpireAt - Date.now()) / 86400000))
}

export function logout() {
  localStorage.removeItem(USER_KEY)
}
