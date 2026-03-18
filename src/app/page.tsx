import Link from 'next/link';

export default function LandingPage() {
  return (
    <main style={{ maxWidth: '800px', padding: '4rem 1rem', textAlign: 'center' }}>
      <div style={{ marginBottom: '4rem' }}>
        <div style={{ 
          display: 'inline-block', 
          padding: '0.5rem 1rem', 
          background: '#e7f3ff', 
          color: 'var(--primary)', 
          borderRadius: '20px', 
          fontSize: '0.9rem', 
          fontWeight: '700',
          marginBottom: '1.5rem'
        }}>
          PROJECT: SHARE BILL
        </div>
        <h1 style={{ fontSize: '3.5rem', marginBottom: '1.5rem' }}>
          Share bill with your friends, easily.
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--secondary)', marginBottom: '2.5rem', lineHeight: '1.8' }}>
          The ultimate tool for splitting costs without the headache. 
          Add your items, pick your friends, and share the link. 
          No accounts, no database, 100% free.
        </p>
        <Link href="/bill" className="btn-primary" style={{ 
          fontSize: '1.25rem', 
          padding: '1rem 2.5rem', 
          textDecoration: 'none', 
          display: 'inline-block',
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 123, 255, 0.3)'
        }}>
          Open Share bill
        </Link>
      </div>

      <div className="grid-cols-2" style={{ textAlign: 'left', marginTop: '4rem' }}>
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Split with Friends</h3>
          <p style={{ color: 'var(--secondary)' }}>
            Designed specifically for groups. Add your friends once and assign them to any item on the bill.
          </p>
        </div>
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Instant Sharing</h3>
          <p style={{ color: 'var(--secondary)' }}>
            One click to copy a link that contains all your data. Send it via any chat app and you&apos;re done.
          </p>
        </div>
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Fair Calculations</h3>
          <p style={{ color: 'var(--secondary)' }}>
            Automatically calculates shared items and distributes tax/service charges proportionally.
          </p>
        </div>
        <div className="card" style={{ padding: '2rem' }}>
          <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Zero Data Tracking</h3>
          <p style={{ color: 'var(--secondary)' }}>
            We don&apos;t store your data on any server. The URL is your database. Private and secure.
          </p>
        </div>
      </div>

      <footer style={{ marginTop: '6rem', color: '#999', fontSize: '0.9rem' }}>
        &copy; {new Date().getFullYear()} Share bill. Share bill with your friends.
      </footer>
    </main>
  );
}
