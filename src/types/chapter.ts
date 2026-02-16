/**
 * 章节定义
 */
export interface ChapterDefinition {
  id: string;
  title: string;
  description?: string;
}

/**
 * 章节分组
 */
export interface ChapterGroup {
  name: string;
  description?: string;
  chapters: string[];
}

/**
 * 章节状态
 */
export type ChapterStatus = 'pending' | 'in_progress' | 'completed' | 'needs-update';

/**
 * 章节状态记录
 */
export interface ChapterState {
  id: string;
  status: ChapterStatus;
  startedAt?: string;
  completedAt?: string;
}
