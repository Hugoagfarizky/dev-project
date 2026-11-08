import type { ProjectDocument } from '../project/types.ts';
import type { ProjectRepository } from './ProjectRepository.ts';

export class MemoryProjectRepository implements ProjectRepository {
  private records = new Map<string, ProjectDocument>();

  isAvailable(): boolean {
    return true;
  }

  async list(): Promise<ProjectDocument[]> {
    return [...this.records.values()].sort((a, b) =>
      b.project.updatedAt.localeCompare(a.project.updatedAt)
    );
  }

  async get(id: string): Promise<ProjectDocument | null> {
    return this.records.get(id) ?? null;
  }

  async save(project: ProjectDocument): Promise<void> {
    this.records.set(project.project.id, cloneProject(project));
  }

  async delete(id: string): Promise<void> {
    this.records.delete(id);
  }
}

function cloneProject(project: ProjectDocument): ProjectDocument {
  return {
    format: project.format,
    schemaVersion: project.schemaVersion,
    project: { ...project.project },
    world: {
      format: project.world.format,
      schemaVersion: project.world.schemaVersion,
      entities: project.world.entities.map((entity) => ({
        id: entity.id,
        name: entity.name,
        type: entity.type,
        transform: {
          position: { ...entity.transform.position },
          rotation: { ...entity.transform.rotation },
          scale: { ...entity.transform.scale }
        },
        metadata: { ...entity.metadata }
      }))
    }
  };
}