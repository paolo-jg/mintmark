'use client'

export function CookieSettingsButton() {
  return (
    <button
      onClick={() => {
        localStorage.removeItem('pc_cookie_consent')
        window.location.reload()
      }}
      className="hover:text-foreground transition-colors cursor-pointer"
    >
      Cookie Settings
    </button>
  )
}
