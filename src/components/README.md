# Shared components

- **AppShell.jsx** — the topbar + page layout wrapper used by every signed-in
  dashboard (doctor/receptionist/admin). Shows the signed-in user and a
  sign-out button.
- **ProtectedRoute.jsx** — `PublicOnly` (login pages, redirects away if
  already signed in) and `RoleRoute` (dashboard pages, redirects to login or
  `/unauthorized` based on role). See `docs/ARCHITECTURE.md`.
- **LoadingScreen.jsx** — full-screen loading state shown while the auth
  session/profile is resolving.
- **InviteStaffForm.jsx** — the doctor/receptionist invite form, shared by
  `CreateDoctor.jsx` (receptionist, clinic fixed) and `AdminDashboard.jsx`
  (admin, picks any clinic). Calls `staffService.inviteStaff`.
