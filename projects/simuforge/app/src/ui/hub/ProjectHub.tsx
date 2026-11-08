import { useEffect, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { ProjectRepository } from '../../storage/ProjectRepository.js';
import type { ProjectDocument } from '../../project/types.ts';
import { Button } from '../common/Button';

interface ProjectHubProps {
  repository: ProjectRepository;
  onOpen: (project: ProjectDocument) => void;
  onNew: (name: string) => Promise<void>;
  onImport: (file: File) => Promise<string | null>;
  storageAvailable: boolean;
}

export function ProjectHub({ repository, onOpen, onNew, onImport, storageAvailable }: ProjectHubProps) {
  const [projects, setProjects] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState('');

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      if (!repository.isAvailable()) {
        setProjects([]);
        setError('Storage unavailable');
      } else {
        setProjects(await repository.list());
      }
    } catch (e) {
      setError(String((e as { message?: string })?.message ?? e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, [repository]);

  async function handleNew() {
    const name = newName.trim() || 'Untitled Simulation';
    await onNew(name);
    setNewName('');
    await refresh();
  }

  async function handleImportChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const err = await onImport(file);
    if (err) setError(err);
    await refresh();
    event.target.value = '';
  }

  return (
    <div className="sf-project-hub">
      <h1>Project Hub</h1>
      {!storageAvailable ? <p className="sf-storage-banner">Storage unavailable. Use Export Copy to save projects.</p> : null}
      {error ? <p className="sf-hub-error" role="alert">{error}</p> : null}
      <div className="sf-hub-actions">
        <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Project name" aria-label="New project name" />
        <Button variant="primary" size="sm" onClick={handleNew}>New Project</Button>
        <label className="sf-import-label">
          <Button variant="secondary" size="sm" onClick={() => document.getElementById('sf-import-input')?.click()}>Import</Button>
          <input id="sf-import-input" type="file" accept=".simuforge.json" style={{ display: 'none' }} onChange={handleImportChange} />
        </label>
      </div>
      {loading ? <p>Loading…</p> : null}
      {!loading && projects.length === 0 ? <p>No projects yet.</p> : null}
      <ul className="sf-hub-list">
        {projects.map((p) => (
          <li key={p.project.id} className="sf-hub-item">
            <div>
              <strong>{p.project.name}</strong>
              <span> — {new Date(p.project.updatedAt).toLocaleString()}</span>
            </div>
            <Button variant="secondary" size="sm" onClick={() => onOpen(p)}>Open</Button>
          </li>
        ))}
      </ul>
    </div>
  );
}