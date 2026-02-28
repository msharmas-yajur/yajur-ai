export default function HealthPage() {
    return (
        <div style={{
            fontFamily: 'system-ui, sans-serif',
            padding: '2rem',
            textAlign: 'center',
            backgroundColor: '#f8f9fa',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
        }}>
            <h1 style={{ color: '#007bff' }}>Yajur AI Assistant Backend</h1>
            <p style={{ fontSize: '1.2rem', color: '#6c757d' }}>Status: <strong>Running on Port 3330</strong></p>
            <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center', gap: '1rem' }}>
                <a href="/api/copilot" style={{ color: '#007bff', textDecoration: 'none', border: '1px solid #007bff', padding: '0.5rem 1rem', borderRadius: '4px' }}>Copilot API</a>
                <a href="/api/livekit" style={{ color: '#007bff', textDecoration: 'none', border: '1px solid #007bff', padding: '0.5rem 1rem', borderRadius: '4px' }}>LiveKit API</a>
            </div>
        </div>
    );
}
