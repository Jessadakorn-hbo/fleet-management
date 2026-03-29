function HomePage({ onLogout }) {
  return (
    <main className="shell">
      <section className="hero-card">
        <p className="eyebrow">Fleet Management</p>
        <h1>Signed in successfully</h1>
        <p className="hero-copy">
          Login flow is active. You can use this page as the authenticated landing
          page and extend it with dashboard widgets next.
        </p>
        <div className="hero-actions">
          <button className="primary-button" type="button">
            Open dashboard
          </button>
          <button className="secondary-button" type="button" onClick={onLogout}>
            Log out
          </button>
        </div>
      </section>
    </main>
  );
}

export default HomePage;
