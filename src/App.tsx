import { useEffect, useState } from 'react';

interface Contact {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  address?: string;
}

export default function App() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<Contact | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/contacts')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<Contact[]>;
      })
      .then((data) => {
        setContacts(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(String(err));
        setLoading(false);
      });
  }, []);

  return (
    <div className="app">
      <header>
        <h1>Address Book</h1>
        <p className="subtitle">
          React + Vite UI · Express BFF · Spring Boot API · all running on
          Kubernetes
        </p>
      </header>

      {loading && <p className="status">Loading contacts…</p>}
      {error && <p className="status error">Error: {error}</p>}

      {!loading && !error && (
        <div className="layout">
          <aside>
            <h2>Contacts ({contacts.length})</h2>
            <ul>
              {contacts.map((c) => (
                <li
                  key={c.id}
                  className={selected?.id === c.id ? 'active' : ''}
                  onClick={() => setSelected(c)}
                >
                  <span className="name">
                    {c.firstName} {c.lastName}
                  </span>
                  <span className="email">{c.email}</span>
                </li>
              ))}
            </ul>
          </aside>

          <main>
            {selected ? (
              <>
                <h2>
                  {selected.firstName} {selected.lastName}
                </h2>
                <dl>
                  <dt>Email</dt>
                  <dd>{selected.email}</dd>
                  {selected.phone && (
                    <>
                      <dt>Phone</dt>
                      <dd>{selected.phone}</dd>
                    </>
                  )}
                  {selected.address && (
                    <>
                      <dt>Address</dt>
                      <dd>{selected.address}</dd>
                    </>
                  )}
                  <dt>ID</dt>
                  <dd>
                    <code>{selected.id}</code>
                  </dd>
                </dl>
              </>
            ) : (
              <p className="hint">Select a contact from the list.</p>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
