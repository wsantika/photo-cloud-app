"use client";

import QRCode from "react-qr-code";

type PhotoSessionQrProps = {
  value: string;
};

export function PhotoSessionQr({ value }: PhotoSessionQrProps) {
  return (
    <div className="inline-flex rounded-xl bg-white p-4">
      <QRCode
        value={value}
        size={160}
        style={{ height: "auto", maxWidth: "100%", width: "100%" }}
        viewBox="0 0 256 256"
      />
    </div>
  );
}
