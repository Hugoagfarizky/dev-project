export function StatusBar() {
  return (
    <footer className="sf-statusbar" aria-label="Status bar">
      <span className="sf-status-item">Selection: None</span>
      <span className="sf-status-item">Entities: 0</span>
      <span className="sf-status-item">Tool: Translate</span>
      <span className="sf-status-spacer" />
      <span className="sf-status-item">WebGL 2</span>
      <span className="sf-status-item">Save: Not saved</span>
    </footer>
  );
}
