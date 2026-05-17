export default function HomePage() {
  return (
    <main style={{ fontFamily: "sans-serif", maxWidth: 760, margin: "48px auto", padding: "0 20px" }}>
      <h1>YouTube Transcript MCP</h1>
      <p>
        This project exposes a remote MCP server for fetching YouTube transcripts and metadata.
      </p>
      <p>
        Primary MCP endpoint: <code>/api/mcp</code>
      </p>
      <p>
        Daily digest cron endpoint: <code>/api/cron/digest</code>
      </p>
    </main>
  );
}
