import React, { useEffect, useState } from 'react';

export default function SwUpdatePrompt() {
  const [waitingReg, setWaitingReg] = useState(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onUpdate(e) {
      setWaitingReg(e.detail && e.detail.registration ? e.detail.registration : null);
      setVisible(true);
    }
    window.addEventListener('swUpdated', onUpdate);
    return () => window.removeEventListener('swUpdated', onUpdate);
  }, []);

  useEffect(() => {
    if (!waitingReg) setVisible(false);
  }, [waitingReg]);

  if (!visible) return null;

  const doUpdate = async () => {
    if (!waitingReg || !waitingReg.waiting) return;
    // send message to SW to skip waiting
    try {
      waitingReg.waiting.postMessage({ type: 'SKIP_WAITING' });
    } catch (e) {
      // fallback: call skipWaiting via registration if available
      try {
        await waitingReg.waiting.skipWaiting();
      } catch (err) {}
    }

    // listen for controller change and then reload
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
    setVisible(false);
  };

  return (
    <div style={{ position: 'fixed', left: 12, bottom: 12, zIndex: 9999 }}>
      <div className="card" style={{ padding: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ fontSize: 14 }}>A new version is available.</div>
        <div>
          <button className="btn btn-primary btn-sm" onClick={doUpdate}>
            Update
          </button>
        </div>
      </div>
    </div>
  );
}
