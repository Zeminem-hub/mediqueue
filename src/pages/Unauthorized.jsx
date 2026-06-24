export default function Unauthorized() {
  return (
    <div style={{ textAlign: 'center', padding: '4rem', fontFamily: 'Inter, sans-serif' }}>
      <h1 style={{ color: '#1B3A5C' }}>Access Denied</h1>
      <p style={{ color: '#5C6B7A' }}>You don't have permission to view this page.</p>
      <a href="/login" style={{ color: '#2E75B6' }}>Go back to login</a>
    </div>
  )
}