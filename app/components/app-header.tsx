export default function AppHeader() {
  return (
    <header className="topbar">
      <a className="brand" href="#sales-entry" aria-label="Telstra Sales Portal home">
        <span className="brand-mark">M</span>
        <span>Mobile Connect</span>
      </a>
      <button className="profile-button" type="button" aria-label="Open profile menu">
        <span className="profile-avatar">AS</span>
        <span className="profile-name">Ansari Saif</span>
      </button>
    </header>
  );
}
