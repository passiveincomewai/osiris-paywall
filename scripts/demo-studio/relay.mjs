// Local no-auth CONNECT relay -> sandbox egress proxy (IPv6, Basic auth from env).
// Chromium cannot reliably reach/auth the egress proxy directly; this shim is the
// pattern the site-graphics capture pipeline used. Credentials come from the
// process env at runtime and are never printed or persisted.
import http from "node:http";
import net from "node:net";

export function startRelay() {
  const p = new URL(process.env.https_proxy || process.env.HTTPS_PROXY || "");
  const auth = "Basic " + Buffer.from(
    `${decodeURIComponent(p.username)}:${decodeURIComponent(p.password)}`
  ).toString("base64");
  const proxyHost = p.hostname;
  const proxyPort = Number(p.port || 3128);

  const server = http.createServer((req, res) => {
    // Plain-HTTP absolute-form proxying via raw socket (https uses CONNECT).
    const socket = net.connect({ host: proxyHost, port: proxyPort, family: 6 }, () => {
      const lines = [`${req.method} ${req.url} HTTP/1.1`, `Host: ${req.headers.host || ""}`, `Proxy-Authorization: ${auth}`, "Proxy-Connection: close"];
      for (const [k, v] of Object.entries(req.headers)) {
        if (["host", "proxy-authorization", "proxy-connection", "connection"].includes(k)) continue;
        lines.push(`${k}: ${v}`);
      }
      socket.write(lines.join("\r\n") + "\r\n\r\n");
      req.pipe(socket); socket.pipe(res.socket);
    });
    socket.on("error", () => { try { res.socket.destroy(); } catch {} });
  });

  server.on("connect", (req, clientSocket, head) => {
    const upstream = net.connect({ host: proxyHost, port: proxyPort, family: 6 }, () => {
      upstream.write(
        `CONNECT ${req.url} HTTP/1.1\r\nHost: ${req.url}\r\nProxy-Authorization: ${auth}\r\nProxy-Connection: keep-alive\r\n\r\n`
      );
      if (head?.length) upstream.write(head);
    });
    let buf = Buffer.alloc(0);
    const onData = (chunk) => {
      buf = Buffer.concat([buf, chunk]);
      const idx = buf.indexOf("\r\n\r\n");
      if (idx === -1) return;
      upstream.off("data", onData);
      const statusLine = buf.slice(0, buf.indexOf("\r\n")).toString("latin1");
      const rest = buf.slice(idx + 4);
      if (!/ 200 /.test(statusLine + " ")) { clientSocket.end("HTTP/1.1 502 Bad Gateway\r\n\r\n"); upstream.destroy(); return; }
      clientSocket.write("HTTP/1.1 200 Connection Established\r\n\r\n");
      if (rest.length) clientSocket.write(rest);
      upstream.pipe(clientSocket); clientSocket.pipe(upstream);
    };
    upstream.on("data", onData);
    upstream.on("error", () => clientSocket.destroy());
    clientSocket.on("error", () => upstream.destroy());
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve({
      port: server.address().port,
      close: () => server.close(),
    }));
  });
}
