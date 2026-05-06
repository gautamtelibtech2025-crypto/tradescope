import { useState } from "react";

export default function ManualExchange() {
  const [appId, setAppId] = useState("");
  const [secretId, setSecretId] = useState("");
  const [authCode, setAuthCode] = useState("");
  const [backendUrl, setBackendUrl] = useState(() => {
    try {
      return localStorage.getItem("ts_backend_api_url") || "";
    } catch (e) {
      return "";
    }
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);

    const target = (backendUrl || "/exchange").replace(/\/+$/, "");
    const url = target.endsWith("/exchange") ? target : `${target}/exchange`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auth_code: authCode, app_id: appId, secret_id: secretId }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError({ status: res.status, data: json || (await res.text()) });
      } else {
        setResult(json);
      }
    } catch (e) {
      setError({ message: String(e) });
    } finally {
      setLoading(false);
    }
  }

  function saveBackendUrl() {
    try {
      localStorage.setItem("ts_backend_api_url", backendUrl || "");
      alert("Saved backend URL to localStorage");
    } catch (e) {
      alert("Failed to save backend URL: " + e.message);
    }
  }

  return (
    <main>
      <h1>Manual FYERS Token Exchange</h1>
      <p>Paste your App ID, Secret ID and the auth code returned by FYERS, then press Exchange.</p>

      <form onSubmit={submit}>
        <label>Backend Exchange URL (py-exchange or similar)</label>
        <input value={backendUrl} onChange={(e) => setBackendUrl(e.target.value)} placeholder="https://<host>/exchange or leave blank for /exchange" />
        <button type="button" onClick={saveBackendUrl}>Save Backend URL</button>

        <label>App ID (client_id)</label>
        <input value={appId} onChange={(e) => setAppId(e.target.value)} placeholder="GCANHWSSCK-100" />

        <label>Secret ID (secret_key)</label>
        <input value={secretId} onChange={(e) => setSecretId(e.target.value)} placeholder="DPUL9ZREFZ" />

        <label>Auth Code</label>
        <input value={authCode} onChange={(e) => setAuthCode(e.target.value)} placeholder="paste auth code here" />

        <div style={{ marginTop: 12 }}>
          <button type="submit" disabled={loading}>Exchange</button>
        </div>
      </form>

      <section style={{ marginTop: 20 }}>
        <h3>Result</h3>
        {loading ? <div>Running exchange...</div> : null}
        {error ? (
          <div style={{ padding: "12px", background: "#ffebee", border: "1px solid #ef5350", borderRadius: "4px" }}>
            <strong>Error:</strong>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: "12px" }}>{JSON.stringify(error, null, 2)}</pre>
          </div>
        ) : null}
        {result ? (
          <div style={{ padding: "12px", background: "#e8f5e9", border: "1px solid #66bb6a", borderRadius: "4px" }}>
            <strong>Success!</strong>
            {result.access_token ? (
              <div style={{ marginTop: "12px" }}>
                <div style={{ marginBottom: "8px" }}>
                  <strong>Access Token:</strong>
                  <input
                    type="text"
                    readOnly
                    value={result.access_token}
                    style={{ width: "100%", marginTop: "4px", padding: "8px", fontFamily: "monospace", fontSize: "11px" }}
                  />
                </div>
                {result.refresh_token ? (
                  <div>
                    <strong>Refresh Token:</strong>
                    <input
                      type="text"
                      readOnly
                      value={result.refresh_token}
                      style={{ width: "100%", marginTop: "4px", padding: "8px", fontFamily: "monospace", fontSize: "11px" }}
                    />
                  </div>
                ) : null}
              </div>
            ) : null}
            <details style={{ marginTop: "12px" }}>
              <summary>Full Response</summary>
              <pre style={{ whiteSpace: "pre-wrap", fontSize: "12px", marginTop: "8px" }}>{JSON.stringify(result, null, 2)}</pre>
            </details>
          </div>
        ) : null}
      </section>
    </main>
  );
}
