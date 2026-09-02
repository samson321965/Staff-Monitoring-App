import { QRCodeCanvas } from "qrcode.react";
import "../styles/Share.css";

function Share() {
  const appUrl = window.location.origin;

  return (
    <main className="share-page">
      <section className="share-panel" aria-labelledby="share-title">
        <p className="share-kicker">Staff Monitoring App</p>
        <h1 id="share-title">Open on your phone</h1>
        <p className="share-copy">
          Scan this code while your phone is connected to the same Wi-Fi network.
        </p>
        <div className="share-qr" aria-label={`QR code for ${appUrl}`}>
          <QRCodeCanvas value={appUrl} size={240} level="H" includeMargin />
        </div>
        <p className="share-url">{appUrl}</p>
        <p className="share-note">Keep the development server running while you use the app.</p>
      </section>
    </main>
  );
}

export default Share;
