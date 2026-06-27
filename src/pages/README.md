# Pages

One file per route, wired up in `src/App.jsx`. Subfolders group each role's
dashboard:

- `patient/` — clinic/doctor pickers and the live queue board
- `doctor/` — `DoctorDashboard.jsx`
- `receptionist/` — `ReceptionistDashboard.jsx`
- `admin/` — `AdminDashboard.jsx`

Top-level files are mostly login screens (`PatientLogin`, `DoctorLogin`,
`ReceptionistLogin`, `AdminLogin`, `RoleSelection`), plus `Unauthorized.jsx`
(shown when a signed-in user's role doesn't match the route) and
`CreateDoctor.jsx` (the receptionist-facing "invite a doctor" screen, reuses
`<InviteStaffForm>`).

`pages/DoctorDashboard.jsx` and `pages/ReceptionistDashboard.jsx` are thin
re-export shims kept for backwards-compatible imports — the real
implementations live in their role subfolders.
